import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { InMemorySyncRunStore, IngestionService } from '../src/index.js';

describe('IngestionService sync status', () => {
  it('marks a run complete only after graph persistence and audit evidence', async () => {
    const runs = new InMemorySyncRunStore();
    const service = new IngestionService(
      new InMemoryAccessGraphRepository(),
      new InMemoryAuditLedger(),
      runs,
    );
    const run = await service.ingest({
      tenantId: 'acme',
      connectorId: 'github-cloud',
      startedAt: '2026-07-14T10:00:00.000Z',
      completedAt: '2026-07-14T10:01:00.000Z',
      events: [],
    });
    expect(run).toMatchObject({ status: 'completed', eventCount: 0 });
    await expect(service.listSyncRuns('acme')).resolves.toEqual([run]);
  });

  it('records a failed run without exposing a non-error value', async () => {
    const runs = new InMemorySyncRunStore();
    const service = new IngestionService(
      {
        applySync: async () => {
          throw new Error('provider credentials are invalid');
        },
      } as never,
      new InMemoryAuditLedger(),
      runs,
    );
    await expect(
      service.ingest({
        tenantId: 'acme',
        connectorId: 'github-cloud',
        startedAt: '2026-07-14T10:00:00.000Z',
        completedAt: '2026-07-14T10:01:00.000Z',
        events: [],
      }),
    ).rejects.toThrow('provider credentials are invalid');
    await expect(service.listSyncRuns('acme')).resolves.toMatchObject([
      { status: 'failed', error: 'provider credentials are invalid' },
    ]);
  });
});
