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

export interface ConnectorCheckpoint {
  readonly cursor?: string;
  readonly watermark?: string;
}
export interface ConnectorEvent {
  readonly type: 'identity.upsert' | 'resource.upsert' | 'entitlement.upsert' | 'grant.upsert';
  readonly externalId: string;
  readonly observedAt: string;
}
export interface RetryDirective {
  readonly retryAfterMs: number;
  readonly reason: 'rate_limit' | 'transient_failure';
}
export function checkpoint(cursor?: string, watermark?: string): ConnectorCheckpoint {
  return { ...(cursor ? { cursor } : {}), ...(watermark ? { watermark } : {}) };
}
export function retryForStatus(
  status: number,
  retryAfterSeconds?: number,
): RetryDirective | undefined {
  if (status !== 429 && ![502, 503, 504].includes(status)) return undefined;
  return {
    reason: status === 429 ? 'rate_limit' : 'transient_failure',
    retryAfterMs: Math.max(0, retryAfterSeconds ?? 0.25) * 1000,
  };
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
