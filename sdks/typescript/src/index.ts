export const protocolVersion = '1.0.0' as const;
export type ReadOnlyCapability = 'IDENTITY_READ' | 'ACCESS_GRAPH_READ' | 'USAGE_READ';
const readOnlyCapabilities: readonly ReadOnlyCapability[] = [
  'IDENTITY_READ',
  'ACCESS_GRAPH_READ',
  'USAGE_READ',
];

export interface ConnectorManifest {
  readonly protocolVersion: typeof protocolVersion;
  readonly id: string;
  readonly capabilities: readonly ReadOnlyCapability[];
  readonly minimumScopes: readonly string[];
}

export function assertReadOnlyManifest(manifest: ConnectorManifest): void {
  if (manifest.protocolVersion !== protocolVersion)
    throw new Error('Unsupported connector protocol version');
  if (!/^[a-z][a-z0-9-]{2,62}$/.test(manifest.id)) throw new Error('Invalid connector ID');
  if (!manifest.capabilities.length || !manifest.minimumScopes.length) {
    throw new Error('Read-only connector manifests require capabilities and scopes');
  }
  if (!manifest.capabilities.every((capability) => readOnlyCapabilities.includes(capability))) {
    throw new Error('Connector manifests cannot declare write capabilities');
  }
}

export function redactFixture<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redactFixture) as T;
  if (typeof value === 'string') return value.replace(/bearer\s+\S+/gi, 'REDACTED') as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        /token|secret|authorization|password/i.test(key) ? 'REDACTED' : redactFixture(nested),
      ]),
    ) as T;
  }
  return value;
}
