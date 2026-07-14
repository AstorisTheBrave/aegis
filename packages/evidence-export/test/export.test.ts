import { describe, expect, it } from 'vitest';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import type { ReviewCampaign } from '@aegis/reviews';
import { exportCampaignEvidence, exportEvidence, verifyCampaignEvidence } from '../src/index.js';
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

describe('campaign evidence export', () =>
  it('verifies canonical campaign, finding, and audit files and rejects tampering', async () => {
    const ledger = new InMemoryAuditLedger();
    const campaign: ReviewCampaign = {
      id: 'campaign:1',
      tenantId: 't',
      title: 'July GitHub review',
      createdAt: '2026-07-14T00:00:00.000Z',
      status: 'complete',
      tasks: [
        {
          id: 'task:1',
          tenantId: 't',
          campaignId: 'campaign:1',
          finding: {
            id: 'finding:1',
            type: 'DIRECT_GRANT_DRIFT',
            severity: 'low',
            ruleId: 'github.direct-grant-drift.v1',
            title: 'Direct repository grant bypasses team access',
            evidence: { grantId: 'grant:1' },
            sourceFacts: [],
            subject: { grantId: 'grant:1' },
          },
          route: 'unassigned',
          status: 'completed',
          decisions: [],
        },
      ],
    };
    await ledger.append({
      tenantId: 't',
      occurredAt: '2026-07-14T00:01:00.000Z',
      actor: 'admin@acme.dev',
      type: 'review.campaign.created',
      data: { campaignId: campaign.id },
    });
    const bundle = await exportCampaignEvidence(ledger, campaign, '2026-07-14T01:00:00.000Z');
    expect(verifyCampaignEvidence(bundle)).toEqual({ valid: true });
    expect(
      verifyCampaignEvidence({
        ...bundle,
        files: [{ ...bundle.files[0]!, content: '{"tampered":true}' }, ...bundle.files.slice(1)],
      }),
    ).toEqual({ valid: false });
  }));
