import { SnapshotDirectoryConnector, type ReadOnlyDirectorySource } from '@aegis/connector-runtime';
export const atlassianReadOnlyScopes = ['read:jira-user', 'read:confluence-user'] as const;
export class AtlassianConnector extends SnapshotDirectoryConnector {
  constructor(source: ReadOnlyDirectorySource) {
    super('atlassian-cloud', 'Atlassian Cloud', source);
  }
}
