import { describe, expect, it } from 'vitest';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import type { Finding } from '@aegis/findings';
import { InMemoryReviewCampaignRepository, ReviewCampaignService } from '../src/index.js';

const finding: Finding = {
  id: 'github.direct-grant-drift.v1:alice:repo:grant',
  type: 'DIRECT_GRANT_DRIFT',
  severity: 'low',
  ruleId: 'github.direct-grant-drift.v1',
  title: 'Direct repository grant bypasses team access',
  evidence: { identityId: 'alice', resourceId: 'repo' },
  sourceFacts: [],
  subject: { identityId: 'alice', resourceId: 'repo', grantId: 'grant' },
};

describe('ReviewCampaignService', () => {
  it('routes to a resource owner and records a non-mutating removal recommendation', async () => {
    const audit = new InMemoryAuditLedger();
    const service = new ReviewCampaignService(new InMemoryReviewCampaignRepository(), audit);
    const campaign = await service.create({
      tenantId: 'acme',
      title: 'GitHub July review',
      findings: [finding],
      resources: [{ id: 'repo', businessOwner: 'owner@acme.dev' }],
      fallbackReviewer: 'fallback@acme.dev',
      dueAt: '2026-08-01T00:00:00.000Z',
      actor: 'admin@acme.dev',
      createdAt: '2026-07-14T00:00:00.000Z',
    });
    expect(campaign.tasks[0]).toMatchObject({
      assignedReviewer: 'owner@acme.dev',
      route: 'resource_owner',
      status: 'open',
    });

    const task = await service.decide({
      tenantId: 'acme',
      taskId: campaign.tasks[0]!.id,
      kind: 'remove_recommended',
      reviewer: 'owner@acme.dev',
      rationale: 'Contractor access expired.',
      decidedAt: '2026-07-15T00:00:00.000Z',
    });
    expect(task).toMatchObject({
      status: 'completed',
      decisions: [{ kind: 'remove_recommended' }],
    });
    await expect(audit.list('acme')).resolves.toMatchObject([
      { type: 'review.campaign.created' },
      {
        type: 'review.task.decision.recorded',
        data: expect.objectContaining({ decision: 'remove_recommended', providerMutation: false }),
      },
    ]);
  });

  it('leaves ambiguous ownership unassigned and requires complete delegation and exception data', async () => {
    const service = new ReviewCampaignService(
      new InMemoryReviewCampaignRepository(),
      new InMemoryAuditLedger(),
    );
    const campaign = await service.create({
      tenantId: 'acme',
      title: 'Unassigned',
      findings: [finding],
      resources: [{ id: 'repo' }],
      actor: 'admin@acme.dev',
      createdAt: '2026-07-14T00:00:00.000Z',
    });
    expect(campaign.tasks[0]).toMatchObject({ route: 'unassigned' });
    await expect(
      service.decide({
        tenantId: 'acme',
        taskId: campaign.tasks[0]!.id,
        kind: 'delegate',
        reviewer: 'admin@acme.dev',
        rationale: 'Needs product owner.',
        decidedAt: '2026-07-15T00:00:00.000Z',
      }),
    ).rejects.toThrow('A delegate reviewer is required');
    await expect(
      service.decide({
        tenantId: 'acme',
        taskId: campaign.tasks[0]!.id,
        kind: 'exception',
        reviewer: 'admin@acme.dev',
        rationale: 'Approved for incident response.',
        decidedAt: '2026-07-15T00:00:00.000Z',
      }),
    ).rejects.toThrow('An exception expiry is required');
  });
});
