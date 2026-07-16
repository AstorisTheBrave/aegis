import type { GraphSyncBatch } from '@open-saas-governance/access-graph';
import { buildDirectoryGraph } from './directory-graph.js';
import type { DirectoryGroup, DirectoryIdentity, DirectoryMembership } from './index.js';
import { ReadOnlyProviderClient } from './index.js';

export interface DirectoryConnectorInput {
  readonly tenantId: string;
  readonly token: string;
  readonly now?: Date;
}

export interface DirectoryConnectorDefinition {
  readonly connectorId: string;
  readonly source: string;
  readonly origin: string;
  readonly headers: (input: DirectoryConnectorInput) => Readonly<Record<string, string>>;
  readonly usersPath: string;
  readonly groupsPath: string;
  readonly membersPath: (group: DirectoryGroup) => string;
  readonly users: (payload: unknown) => readonly DirectoryIdentity[];
  readonly groups: (payload: unknown) => readonly DirectoryGroup[];
  readonly memberships: (group: DirectoryGroup, payload: unknown) => readonly DirectoryMembership[];
  readonly nextPath?: (payload: unknown, currentPath: string) => string | undefined;
}

export class DirectoryApiConnector {
  constructor(
    private readonly definition: DirectoryConnectorDefinition,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async sync(input: DirectoryConnectorInput): Promise<GraphSyncBatch> {
    const client = new ReadOnlyProviderClient({
      origin: this.definition.origin,
      headers: this.definition.headers(input),
      fetcher: this.fetcher,
    });
    const [identities, groups] = await Promise.all([
      client.listPages(this.definition.usersPath, (payload, currentPath) => ({
        values: this.definition.users(payload),
        nextPath: this.definition.nextPath?.(payload, currentPath),
      })),
      client.listPages(this.definition.groupsPath, (payload, currentPath) => ({
        values: this.definition.groups(payload),
        nextPath: this.definition.nextPath?.(payload, currentPath),
      })),
    ]);
    const memberships = (
      await Promise.all(
        groups.map((group) =>
          client.listPages(this.definition.membersPath(group), (payload, currentPath) => ({
            values: this.definition.memberships(group, payload),
            nextPath: this.definition.nextPath?.(payload, currentPath),
          })),
        ),
      )
    ).flat();
    return buildDirectoryGraph({
      tenantId: input.tenantId,
      connectorId: this.definition.connectorId,
      source: this.definition.source,
      observedAt: (input.now ?? new Date()).toISOString(),
      identities,
      groups,
      memberships,
    });
  }
}

export interface DirectorySnapshot {
  readonly identities: readonly DirectoryIdentity[];
  readonly groups: readonly DirectoryGroup[];
  readonly memberships: readonly DirectoryMembership[];
}

export interface ReadOnlyDirectorySource {
  read(input: DirectoryConnectorInput): Promise<DirectorySnapshot>;
}

export class SnapshotDirectoryConnector {
  constructor(
    private readonly connectorId: string,
    private readonly sourceName: string,
    private readonly source: ReadOnlyDirectorySource,
  ) {}

  async sync(input: DirectoryConnectorInput): Promise<GraphSyncBatch> {
    const snapshot = await this.source.read(input);
    return buildDirectoryGraph({
      tenantId: input.tenantId,
      connectorId: this.connectorId,
      source: this.sourceName,
      observedAt: (input.now ?? new Date()).toISOString(),
      ...snapshot,
    });
  }
}
