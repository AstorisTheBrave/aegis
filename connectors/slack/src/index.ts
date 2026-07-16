import { SnapshotDirectoryConnector, type ReadOnlyDirectorySource } from '@aegis/connector-runtime';
export const slackReadOnlyScopes = ['users:read', 'usergroups:read', 'channels:read'] as const;
export class SlackConnector extends SnapshotDirectoryConnector {
  constructor(source: ReadOnlyDirectorySource) {
    super('slack', 'Slack', source);
  }
}
