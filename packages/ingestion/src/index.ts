import type { AccessGraphRepository, GraphSyncBatch } from '@open-saas-governance/access-graph';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';

export type SyncRunStatus = 'started' | 'completed' | 'failed';

export interface SyncRun {
  readonly id: string;
  readonly tenantId: string;
  readonly connectorId: string;
  readonly status: SyncRunStatus;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly eventCount?: number;
  readonly error?: string;
}

export interface SyncRunStore {
  start(input: Omit<SyncRun, 'status' | 'completedAt' | 'eventCount' | 'error'>): Promise<SyncRun>;
  complete(input: {
    tenantId: string;
    id: string;
    completedAt: string;
    eventCount: number;
  }): Promise<SyncRun>;
  fail(input: {
    tenantId: string;
    id: string;
    completedAt: string;
    error: string;
  }): Promise<SyncRun>;
  list(tenantId: string): Promise<readonly SyncRun[]>;
}

export class InMemorySyncRunStore implements SyncRunStore {
  readonly #runs = new Map<string, SyncRun>();

  async start(
    input: Omit<SyncRun, 'status' | 'completedAt' | 'eventCount' | 'error'>,
  ): Promise<SyncRun> {
    const run: SyncRun = { ...input, status: 'started' };
    this.#runs.set(key(input.tenantId, input.id), run);
    return run;
  }

  async complete(input: {
    tenantId: string;
    id: string;
    completedAt: string;
    eventCount: number;
  }): Promise<SyncRun> {
    return this.update(input.tenantId, input.id, {
      status: 'completed',
      completedAt: input.completedAt,
      eventCount: input.eventCount,
    });
  }

  async fail(input: {
    tenantId: string;
    id: string;
    completedAt: string;
    error: string;
  }): Promise<SyncRun> {
    return this.update(input.tenantId, input.id, {
      status: 'failed',
      completedAt: input.completedAt,
      error: input.error,
    });
  }

  async list(tenantId: string): Promise<readonly SyncRun[]> {
    return [...this.#runs.values()]
      .filter((run) => run.tenantId === tenantId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  private update(
    tenantId: string,
    id: string,
    values: Pick<SyncRun, 'status' | 'completedAt'> &
      Partial<Pick<SyncRun, 'eventCount' | 'error'>>,
  ): SyncRun {
    const run = this.#runs.get(key(tenantId, id));
    if (!run) throw new Error(`Sync run ${id} not found`);
    const next = { ...run, ...values } as SyncRun;
    this.#runs.set(key(tenantId, id), next);
    return next;
  }
}

export class IngestionService {
  constructor(
    private readonly graph: AccessGraphRepository,
    private readonly audit: AuditLedger,
    private readonly syncRuns: SyncRunStore = new InMemorySyncRunStore(),
  ) {}
  async ingest(batch: GraphSyncBatch): Promise<SyncRun> {
    const run = await this.syncRuns.start({
      id: `sync:${batch.connectorId}:${batch.startedAt}`,
      tenantId: batch.tenantId,
      connectorId: batch.connectorId,
      startedAt: batch.startedAt,
    });
    try {
      await this.graph.applySync(batch);
      await this.audit.append({
        tenantId: batch.tenantId,
        occurredAt: batch.completedAt,
        actor: `connector:${batch.connectorId}`,
        type: 'sync.completed',
        data: {
          connectorId: batch.connectorId,
          eventCount: batch.events.length,
          startedAt: batch.startedAt,
        },
      });
      return this.syncRuns.complete({
        tenantId: batch.tenantId,
        id: run.id,
        completedAt: batch.completedAt,
        eventCount: batch.events.length,
      });
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : 'Unknown sync failure';
      await this.audit.append({
        tenantId: batch.tenantId,
        occurredAt: batch.completedAt,
        actor: `connector:${batch.connectorId}`,
        type: 'sync.failed',
        data: { connectorId: batch.connectorId, startedAt: batch.startedAt, error },
      });
      await this.syncRuns.fail({
        tenantId: batch.tenantId,
        id: run.id,
        completedAt: batch.completedAt,
        error,
      });
      throw cause;
    }
  }

  listSyncRuns(tenantId: string): Promise<readonly SyncRun[]> {
    return this.syncRuns.list(tenantId);
  }
}

function key(tenantId: string, id: string): string {
  return `${tenantId}:${id}`;
}
