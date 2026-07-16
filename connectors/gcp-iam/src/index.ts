import { SnapshotDirectoryConnector, type ReadOnlyDirectorySource } from '@aegis/connector-runtime';
export const gcpIamReadOnlyScopes = [
  'cloudasset.assets.searchAllIamPolicies',
  'resourcemanager.projects.getIamPolicy',
] as const;
export class GcpIamConnector extends SnapshotDirectoryConnector {
  constructor(source: ReadOnlyDirectorySource) {
    super('gcp-iam', 'Google Cloud IAM', source);
  }
}
