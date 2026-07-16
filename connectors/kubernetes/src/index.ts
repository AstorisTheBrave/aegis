import { SnapshotDirectoryConnector, type ReadOnlyDirectorySource } from '@aegis/connector-runtime';
export const kubernetesReadOnlyScopes = ['get', 'list', 'watch'] as const;
export class KubernetesConnector extends SnapshotDirectoryConnector {
  constructor(source: ReadOnlyDirectorySource) {
    super('kubernetes', 'Kubernetes', source);
  }
}
