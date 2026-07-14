import { describe, expect, it } from 'vitest';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { ReviewService } from '../src/index.js';
describe('reviews', () =>
  it('records a non-mutating decision in the audit ledger', async () => {
    const ledger = new InMemoryAuditLedger(),
      service = new ReviewService(ledger);
    const item = service.create({
      id: 'f',
      severity: 'high',
      ruleId: 'r',
      title: 't',
      evidence: {},
    });
    await expect(
      service.decide({
        tenantId: 't',
        itemId: item.id,
        reviewer: 'alex',
        decision: 'revocation_requested',
        at: '2026-01-01T00:00:00Z',
      }),
    ).resolves.toMatchObject({ decision: 'revocation_requested' });
    await expect(ledger.list('t')).resolves.toMatchObject([{ type: 'review.decided' }]);
  }));
