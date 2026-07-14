import { describe, expect, it } from 'vitest';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { exportEvidence } from '../src/index.js';
describe('evidence export', () =>
  it('hashes a tenant-scoped ledger snapshot', async () => {
    const l = new InMemoryAuditLedger();
    await l.append({
      tenantId: 't',
      occurredAt: '2026-01-01T00:00:00Z',
      actor: 'system',
      type: 'sync.completed',
      data: {},
    });
    await expect(exportEvidence(l, 't', '2026-01-01T01:00:00Z')).resolves.toMatchObject({
      tenantId: 't',
      records: [{ type: 'sync.completed' }],
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  }));
