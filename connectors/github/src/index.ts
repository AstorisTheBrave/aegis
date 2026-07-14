import type { GraphSyncBatch, GraphSyncEvent } from '@open-saas-governance/access-graph';

type User = { id: number; login: string; type: string };
type Repository = { id: number; full_name: string; private: boolean; archived: boolean };
type Collaborator = User & { role_name?: string; permissions?: Record<string, boolean> };

export const githubReadOnlyScopes = ['members:read', 'metadata:read'] as const;

export class GitHubConnector {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async sync(input: {
    tenantId: string;
    organization: string;
    token: string;
    now?: Date;
  }): Promise<GraphSyncBatch> {
    const observedAt = (input.now ?? new Date()).toISOString();
    const members = await this.list<User>(
      `/orgs/${encodeURIComponent(input.organization)}/members`,
      input.token,
    );
    const repositories = await this.list<Repository>(
      `/orgs/${encodeURIComponent(input.organization)}/repos?type=all`,
      input.token,
    );
    const events: GraphSyncEvent[] = members.map((user) =>
      identity(input.tenantId, user, observedAt),
    );
    for (const repository of repositories) {
      const resourceId = `github:repo:${repository.id}`;
      events.push({
        type: 'resource.upsert',
        entity: {
          kind: 'resource',
          tenantId: input.tenantId,
          id: resourceId,
          connectorId: 'github-cloud',
          externalId: String(repository.id),
          displayName: repository.full_name,
          resourceType: 'repository',
          observedAt,
          attributes: { private: repository.private, archived: repository.archived },
        },
      });
      const collaborators = await this.list<Collaborator>(
        `/repos/${repository.full_name}/collaborators?affiliation=all`,
        input.token,
      );
      for (const collaborator of collaborators) {
        events.push(identity(input.tenantId, collaborator, observedAt));
        const role = collaborator.role_name ?? highestPermission(collaborator.permissions);
        const entitlementId = `${resourceId}:role:${role}`;
        events.push({
          type: 'entitlement.upsert',
          entity: {
            kind: 'entitlement',
            tenantId: input.tenantId,
            id: entitlementId,
            connectorId: 'github-cloud',
            externalId: `${repository.id}:${role}`,
            displayName: role,
            resourceId,
            entitlementType: 'repository-role',
            privileged: ['admin', 'maintain'].includes(role),
            observedAt,
            attributes: {},
          },
        });
        events.push({
          type: 'grant.upsert',
          entity: {
            kind: 'grant',
            tenantId: input.tenantId,
            id: `${entitlementId}:user:${collaborator.id}`,
            connectorId: 'github-cloud',
            externalId: `${repository.id}:${collaborator.id}:${role}`,
            identityId: `github:user:${collaborator.id}`,
            entitlementId,
            grantType: 'UNKNOWN',
            observedAt,
            attributes: { login: collaborator.login },
          },
        });
      }
    }
    return {
      tenantId: input.tenantId,
      connectorId: 'github-cloud',
      startedAt: observedAt,
      completedAt: new Date().toISOString(),
      events,
    };
  }

  private async list<T>(path: string, token: string): Promise<T[]> {
    const values: T[] = [];
    let url: string | undefined =
      `https://api.github.com${path}${path.includes('?') ? '&' : '?'}per_page=100`;
    while (url) {
      const response = await this.fetcher(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2026-03-10',
        },
      });
      if (!response.ok)
        throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
      values.push(...((await response.json()) as T[]));
      url = next(response.headers.get('link'));
    }
    return values;
  }
}
function identity(tenantId: string, user: User, observedAt: string): GraphSyncEvent {
  return {
    type: 'identity.upsert',
    entity: {
      kind: 'identity',
      tenantId,
      id: `github:user:${user.id}`,
      connectorId: 'github-cloud',
      externalId: String(user.id),
      displayName: user.login,
      status: 'ACTIVE',
      observedAt,
      attributes: { login: user.login, accountType: user.type },
    },
  };
}
function highestPermission(p: Record<string, boolean> | undefined): string {
  return p?.admin
    ? 'admin'
    : p?.maintain
      ? 'maintain'
      : p?.push
        ? 'write'
        : p?.pull
          ? 'read'
          : 'unknown';
}
function next(link: string | null): string | undefined {
  return link?.match(/<([^>]+)>; rel="next"/)?.[1];
}
