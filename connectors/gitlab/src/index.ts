import { SnapshotDirectoryConnector, type ReadOnlyDirectorySource } from '@aegis/connector-runtime';
export const gitlabReadOnlyScopes = ['read_api'] as const;
export class GitLabConnector extends SnapshotDirectoryConnector {
  constructor(source: ReadOnlyDirectorySource) {
    super('gitlab', 'GitLab', source);
  }
}
