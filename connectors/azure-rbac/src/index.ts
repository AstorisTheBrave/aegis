import { SnapshotDirectoryConnector, type ReadOnlyDirectorySource } from '@aegis/connector-runtime';
export const azureRbacReadOnlyScopes = [
  'Microsoft.Authorization/roleAssignments/read',
  'Microsoft.Authorization/roleDefinitions/read',
] as const;
export class AzureRbacConnector extends SnapshotDirectoryConnector {
  constructor(source: ReadOnlyDirectorySource) {
    super('azure-rbac', 'Azure RBAC', source);
  }
}
