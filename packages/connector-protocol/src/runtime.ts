export type ConnectorSyncMode = 'full' | 'incremental';

export interface ConnectorCheckpoint {
  readonly cursor?: string;
  readonly watermark?: string;
  readonly providerState?: Readonly<Record<string, string>>;
}

export interface ConnectorSyncFailure {
  readonly kind: 'rate_limited' | 'transient' | 'partial' | 'invalid_checkpoint';
  readonly message: string;
  readonly retryAfterMs?: number;
  readonly checkpoint?: ConnectorCheckpoint;
}

export interface ConnectorSyncRequest {
  readonly mode: ConnectorSyncMode;
  readonly checkpoint?: ConnectorCheckpoint;
}

export function checkpointFor(cursor?: string, watermark?: string): ConnectorCheckpoint {
  return { ...(cursor ? { cursor } : {}), ...(watermark ? { watermark } : {}) };
}
