import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { IngestionService } from '../src/index.js';
describe('IngestionService', () =>
  it('records a completed sync as evidence', async () => {
    const graph = new InMemoryAccessGraphRepository(),
      audit = new InMemoryAuditLedger();
    await new IngestionService(graph, audit).ingest({
      tenantId: 't',
      connectorId: 'c',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:01:00Z',
      events: [],
    });
    await expect(audit.list('t')).resolves.toMatchObject([{ type: 'sync.completed' }]);
  }));
