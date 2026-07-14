import type { SyncRun, SyncRunStore } from '@aegis/ingestion';
import type { Pool } from 'pg';

type SyncRunRow = {
  tenant_id: string;
  id: string;
  connector_id: string;
  status: SyncRun['status'];
  started_at: Date;
  completed_at: Date | null;
  event_count: number | null;
  error: string | null;
};

export class PostgresSyncRunStore implements SyncRunStore {
  constructor(private readonly pool: Pool) {}

  async start(
    input: Omit<SyncRun, 'status' | 'completedAt' | 'eventCount' | 'error'>,
  ): Promise<SyncRun> {
    await this.pool.query(
      `INSERT INTO governance_sync_runs (tenant_id, id, connector_id, status, started_at)
       VALUES ($1, $2, $3, 'started', $4)`,
      [input.tenantId, input.id, input.connectorId, input.startedAt],
    );
    return { ...input, status: 'started' };
  }

  async complete(input: {
    tenantId: string;
    id: string;
    completedAt: string;
    eventCount: number;
  }): Promise<SyncRun> {
    return this.update(input.tenantId, input.id, 'completed', input.completedAt, input.eventCount);
  }

  async fail(input: {
    tenantId: string;
    id: string;
    completedAt: string;
    error: string;
  }): Promise<SyncRun> {
    return this.update(
      input.tenantId,
      input.id,
      'failed',
      input.completedAt,
      undefined,
      input.error,
    );
  }

  async list(tenantId: string): Promise<readonly SyncRun[]> {
    const result = await this.pool.query<SyncRunRow>(
      `SELECT tenant_id, id, connector_id, status, started_at, completed_at, event_count, error
         FROM governance_sync_runs
        WHERE tenant_id = $1
        ORDER BY started_at DESC, id DESC`,
      [tenantId],
    );
    return result.rows.map(toSyncRun);
  }

  private async update(
    tenantId: string,
    id: string,
    status: Extract<SyncRun['status'], 'completed' | 'failed'>,
    completedAt: string,
    eventCount?: number,
    error?: string,
  ): Promise<SyncRun> {
    const result = await this.pool.query<SyncRunRow>(
      `UPDATE governance_sync_runs
          SET status = $3, completed_at = $4, event_count = $5, error = $6
        WHERE tenant_id = $1 AND id = $2
      RETURNING tenant_id, id, connector_id, status, started_at, completed_at, event_count, error`,
      [tenantId, id, status, completedAt, eventCount ?? null, error ?? null],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Sync run ${id} not found`);
    return toSyncRun(row);
  }
}

function toSyncRun(row: SyncRunRow): SyncRun {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    connectorId: row.connector_id,
    status: row.status,
    startedAt: row.started_at.toISOString(),
    ...(row.completed_at ? { completedAt: row.completed_at.toISOString() } : {}),
    ...(row.event_count !== null ? { eventCount: row.event_count } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}
