import type { AccessGraphRepository, GraphSyncBatch } from '@open-saas-governance/access-graph';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';
export class IngestionService {
  constructor(
    private readonly graph: AccessGraphRepository,
    private readonly audit: AuditLedger,
  ) {}
  async ingest(batch: GraphSyncBatch): Promise<void> {
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
  }
}
