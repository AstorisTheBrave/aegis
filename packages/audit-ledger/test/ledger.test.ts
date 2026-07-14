import { describe, expect, it } from 'vitest';

import { InMemoryAuditLedger, verifyAuditChain } from '../src/index.js';

describe('InMemoryAuditLedger', () => {
  it('chains records deterministically even when object keys are supplied in a different order', async () => {
    const ledger = new InMemoryAuditLedger();

    await ledger.append({
      tenantId: 'tenant-acme',
      occurredAt: '2026-07-14T10:00:00.000Z',
      actor: 'connector:github-cloud',
      type: 'sync.completed',
      data: { connectors: 1, durationMs: 800 },
    });
    const second = await ledger.append({
      tenantId: 'tenant-acme',
      occurredAt: '2026-07-14T10:01:00.000Z',
      actor: 'system',
      type: 'finding.created',
      data: { severity: 'high', resource: 'acme/platform' },
    });

    expect(second.previousHash).toHaveLength(64);
    await expect(ledger.list('tenant-acme')).resolves.toSatisfy(verifyAuditChain);
  });

  it('detects an altered record', async () => {
    const ledger = new InMemoryAuditLedger();
    await ledger.append({
      tenantId: 'tenant-acme',
      occurredAt: '2026-07-14T10:00:00.000Z',
      actor: 'system',
      type: 'sync.completed',
      data: {},
    });

    const altered = (await ledger.list('tenant-acme')).map((record) => ({ ...record }));
    altered[0] = { ...altered[0], actor: 'attacker' };

    expect(verifyAuditChain(altered)).toBe(false);
  });
});
