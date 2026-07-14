import type { GraphSyncBatch, GraphSyncEvent } from '@open-saas-governance/access-graph';

type User = { id: number; login: string; type: string };
type Repository = {
  id: number;
  full_name: string;
  private: boolean;
  archived: boolean;
  html_url?: string;
  owner?: { login?: string };
};
type Collaborator = User & { role_name?: string; permissions?: Record<string, boolean> };
type Team = { id: number; slug: string; name: string; html_url?: string };
type TeamMember = User & { role?: 'member' | 'maintainer'; inherited?: boolean };
type TeamRepository = Repository & { permissions?: Record<string, boolean> };

interface IdentityFacts {
  readonly user: User;
  readonly outsideCollaborator?: boolean;
  readonly organizationRole?: 'admin' | 'member';
}

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
    const organization = encodeURIComponent(input.organization);
    const [members, administrators, outsideCollaborators, repositories, teams] = await Promise.all([
      this.list<User>(`/orgs/${organization}/members`, input.token),
      this.list<User>(`/orgs/${organization}/members?role=admin`, input.token),
      this.list<User>(`/orgs/${organization}/outside_collaborators`, input.token),
      this.list<Repository>(`/orgs/${organization}/repos?type=all`, input.token),
      this.list<Team>(`/orgs/${organization}/teams`, input.token),
    ]);

    const identities = new Map<number, IdentityFacts>();
    const remember = (user: User, facts: Omit<IdentityFacts, 'user'> = {}) => {
      const prior = identities.get(user.id);
      identities.set(user.id, {
        user,
        outsideCollaborator: facts.outsideCollaborator ?? prior?.outsideCollaborator,
        organizationRole: facts.organizationRole ?? prior?.organizationRole,
      });
    };
    members.forEach((user) => remember(user, { organizationRole: 'member' }));
    administrators.forEach((user) => remember(user, { organizationRole: 'admin' }));
    outsideCollaborators.forEach((user) => remember(user, { outsideCollaborator: true }));

    const teamMembers = new Map<number, readonly TeamMember[]>();
    const teamRepositories = new Map<number, readonly TeamRepository[]>();
    for (const team of teams) {
      const [membersForTeam, repositoriesForTeam] = await Promise.all([
        this.list<TeamMember>(
          `/orgs/${organization}/teams/${encodeURIComponent(team.slug)}/members`,
          input.token,
        ),
        this.list<TeamRepository>(
          `/orgs/${organization}/teams/${encodeURIComponent(team.slug)}/repos`,
          input.token,
        ),
      ]);
      membersForTeam.forEach((user) => remember(user));
      teamMembers.set(team.id, membersForTeam);
      teamRepositories.set(team.id, repositoriesForTeam);
    }

    const collaboratorsByRepository = new Map<number, readonly Collaborator[]>();
    for (const repository of repositories) {
      const collaborators = await this.list<Collaborator>(
        `/repos/${repository.full_name}/collaborators?affiliation=all`,
        input.token,
      );
      collaborators.forEach((user) => remember(user));
      collaboratorsByRepository.set(repository.id, collaborators);
    }

    const events: GraphSyncEvent[] = [
      ...[...identities.values()]
        .sort(byUserId)
        .map((facts) => identity(input.tenantId, facts, observedAt, input.organization)),
      organizationResource(input.tenantId, input.organization, observedAt),
      ...repositories.map((repository) =>
        repositoryResource(input.tenantId, repository, observedAt),
      ),
      ...teams.map((team) => teamResource(input.tenantId, team, observedAt)),
      organizationAdminEntitlement(input.tenantId, input.organization, observedAt),
      ...teams.map((team) => teamMemberEntitlement(input.tenantId, team, observedAt)),
      ...repositories.flatMap((repository) =>
        repositoryRoleEntitlements(input.tenantId, repository, observedAt),
      ),
    ];

    for (const administrator of administrators) {
      events.push(
        organizationAdminGrant(input.tenantId, input.organization, administrator, observedAt),
      );
    }
    for (const team of teams) {
      const membersForTeam = teamMembers.get(team.id) ?? [];
      for (const member of membersForTeam) {
        events.push(teamMembershipGrant(input.tenantId, team, member, observedAt));
      }
      for (const repository of teamRepositories.get(team.id) ?? []) {
        const role = highestPermission(repository.permissions);
        for (const member of membersForTeam) {
          events.push(
            teamRepositoryGrant(input.tenantId, team, repository, member, role, observedAt),
          );
        }
      }
    }
    for (const repository of repositories) {
      for (const collaborator of collaboratorsByRepository.get(repository.id) ?? []) {
        const role = collaborator.role_name ?? highestPermission(collaborator.permissions);
        events.push(
          repositoryCollaboratorGrant(input.tenantId, repository, collaborator, role, observedAt),
        );
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
      if (!response.ok) {
        throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
      }
      values.push(...((await response.json()) as T[]));
      url = next(response.headers.get('link'));
    }
    return values;
  }
}

function byUserId(left: IdentityFacts, right: IdentityFacts): number {
  return left.user.id - right.user.id;
}

function identity(
  tenantId: string,
  facts: IdentityFacts,
  observedAt: string,
  organization: string,
): GraphSyncEvent {
  return {
    type: 'identity.upsert',
    entity: {
      kind: 'identity',
      tenantId,
      id: `github:user:${facts.user.id}`,
      connectorId: 'github-cloud',
      externalId: String(facts.user.id),
      displayName: facts.user.login,
      status: 'ACTIVE',
      observedAt,
      attributes: {
        login: facts.user.login,
        accountType: facts.user.type,
        source: 'GitHub',
        sourceAccount: organization,
        sourceUrl: `https://github.com/${facts.user.login}`,
        ...(facts.outsideCollaborator ? { outsideCollaborator: true } : {}),
        ...(facts.organizationRole ? { organizationRole: facts.organizationRole } : {}),
      },
    },
  };
}

function organizationResource(
  tenantId: string,
  organization: string,
  observedAt: string,
): GraphSyncEvent {
  return {
    type: 'resource.upsert',
    entity: {
      kind: 'resource',
      tenantId,
      id: `github:org:${organization}`,
      connectorId: 'github-cloud',
      externalId: organization,
      displayName: organization,
      resourceType: 'organization',
      observedAt,
      attributes: { source: 'GitHub', sourceUrl: `https://github.com/${organization}` },
    },
  };
}

function repositoryResource(
  tenantId: string,
  repository: Repository,
  observedAt: string,
): GraphSyncEvent {
  return {
    type: 'resource.upsert',
    entity: {
      kind: 'resource',
      tenantId,
      id: `github:repo:${repository.id}`,
      connectorId: 'github-cloud',
      externalId: String(repository.id),
      displayName: repository.full_name,
      resourceType: 'repository',
      observedAt,
      attributes: {
        private: repository.private,
        archived: repository.archived,
        source: 'GitHub',
        sourceUrl: repository.html_url ?? `https://github.com/${repository.full_name}`,
        ...(repository.owner?.login ? { providerOwner: repository.owner.login } : {}),
      },
    },
  };
}

function teamResource(tenantId: string, team: Team, observedAt: string): GraphSyncEvent {
  return {
    type: 'resource.upsert',
    entity: {
      kind: 'resource',
      tenantId,
      id: `github:team:${team.id}`,
      connectorId: 'github-cloud',
      externalId: String(team.id),
      displayName: team.name,
      resourceType: 'team',
      observedAt,
      attributes: { slug: team.slug, source: 'GitHub', sourceUrl: team.html_url ?? '' },
    },
  };
}

function organizationAdminEntitlement(
  tenantId: string,
  organization: string,
  observedAt: string,
): GraphSyncEvent {
  return entitlement(
    tenantId,
    `github:org:${organization}`,
    'admin',
    'organization-role',
    true,
    observedAt,
  );
}

function teamMemberEntitlement(tenantId: string, team: Team, observedAt: string): GraphSyncEvent {
  return entitlement(
    tenantId,
    `github:team:${team.id}`,
    'member',
    'team-membership',
    false,
    observedAt,
  );
}

function repositoryRoleEntitlements(
  tenantId: string,
  repository: Repository,
  observedAt: string,
): GraphSyncEvent[] {
  return ['read', 'triage', 'write', 'maintain', 'admin'].map((role) =>
    entitlement(
      tenantId,
      `github:repo:${repository.id}`,
      role,
      'repository-role',
      role === 'admin' || role === 'maintain',
      observedAt,
    ),
  );
}

function entitlement(
  tenantId: string,
  resourceId: string,
  role: string,
  entitlementType: string,
  privileged: boolean,
  observedAt: string,
): GraphSyncEvent {
  return {
    type: 'entitlement.upsert',
    entity: {
      kind: 'entitlement',
      tenantId,
      id: `${resourceId}:role:${role}`,
      connectorId: 'github-cloud',
      externalId: `${resourceId}:${role}`,
      displayName: role,
      resourceId,
      entitlementType,
      privileged,
      observedAt,
      attributes: { source: 'GitHub' },
    },
  };
}

function organizationAdminGrant(
  tenantId: string,
  organization: string,
  administrator: User,
  observedAt: string,
): GraphSyncEvent {
  return grant(
    tenantId,
    `github:org:${organization}:role:admin`,
    administrator,
    'DIRECT',
    observedAt,
    { accessPath: 'organization-admin' },
  );
}

function teamMembershipGrant(
  tenantId: string,
  team: Team,
  member: TeamMember,
  observedAt: string,
): GraphSyncEvent {
  return grant(
    tenantId,
    `github:team:${team.id}:role:member`,
    member,
    member.inherited ? 'INHERITED' : 'DIRECT',
    observedAt,
    { accessPath: 'team-membership', teamRole: member.role ?? 'member' },
  );
}

function teamRepositoryGrant(
  tenantId: string,
  team: Team,
  repository: TeamRepository,
  member: TeamMember,
  role: string,
  observedAt: string,
): GraphSyncEvent {
  return grant(tenantId, `github:repo:${repository.id}:role:${role}`, member, 'GROUP', observedAt, {
    accessPath: 'team-repository',
    teamId: String(team.id),
    teamSlug: team.slug,
  });
}

function repositoryCollaboratorGrant(
  tenantId: string,
  repository: Repository,
  collaborator: Collaborator,
  role: string,
  observedAt: string,
): GraphSyncEvent {
  return grant(
    tenantId,
    `github:repo:${repository.id}:role:${role}`,
    collaborator,
    'DIRECT',
    observedAt,
    { accessPath: 'repository-collaborator', login: collaborator.login },
  );
}

function grant(
  tenantId: string,
  entitlementId: string,
  user: User,
  grantType: 'DIRECT' | 'GROUP' | 'INHERITED',
  observedAt: string,
  attributes: Readonly<Record<string, string>>,
): GraphSyncEvent {
  return {
    type: 'grant.upsert',
    entity: {
      kind: 'grant',
      tenantId,
      id: `${entitlementId}:user:${user.id}:${grantType.toLowerCase()}`,
      connectorId: 'github-cloud',
      externalId: `${entitlementId}:${user.id}:${grantType}`,
      identityId: `github:user:${user.id}`,
      entitlementId,
      grantType,
      observedAt,
      attributes,
    },
  };
}

function highestPermission(permissions: Record<string, boolean> | undefined): string {
  return permissions?.admin
    ? 'admin'
    : permissions?.maintain
      ? 'maintain'
      : permissions?.push
        ? 'write'
        : permissions?.triage
          ? 'triage'
          : permissions?.pull
            ? 'read'
            : 'read';
}

function next(link: string | null): string | undefined {
  return link?.match(/<([^>]+)>; rel="next"/)?.[1];
}
