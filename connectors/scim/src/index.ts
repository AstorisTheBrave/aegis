import { SnapshotDirectoryConnector, type ReadOnlyDirectorySource } from '@aegis/connector-runtime';
export const scimReadOnlyScopes = ['Users.read', 'Groups.read'] as const;
export class ScimConnector extends SnapshotDirectoryConnector {
  constructor(source: ReadOnlyDirectorySource) {
    super('scim-2', 'SCIM 2.0', source);
  }
}
