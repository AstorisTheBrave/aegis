import { describe, expect, it } from 'vitest';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { InMemoryDiscoveryRepository } from '@aegis/discovery';
import { InMemorySaasCatalogRepository } from '@aegis/saas-catalog';
import { InMemoryReviewCampaignRepository } from '@aegis/reviews';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { CatalogDiscoveryManager } from '../src/discovery.js';
import { PolicyReviewCampaignManager } from '../src/review-campaigns.js';
import { DiscoveryReviewPolicyManager } from '../src/review-policies.js';
import { createApp } from '../src/app.js';

describe('policy review campaigns', () => {
  it('uses immutable source timestamps and creates an auditable owner review', async () => {
    const discovery = new CatalogDiscoveryManager(
      new InMemorySaasCatalogRepository(),
      new InMemoryDiscoveryRepository(),
    );
    await discovery.createCatalog({
      tenantId: 'acme',
      id: 'design-tool',
      vendorName: 'Design Tool',
      normalizedName: 'design tool',
      domains: [],
      aliases: ['design tool'],
      category: 'design',
      riskTier: 'medium',
      dataClassification: 'internal',
      recommendation: 'monitor',
      owners: [],
      approvedAlternatives: [],
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-02T00:00:00.000Z',
    });
    await discovery.observe({
      tenantId: 'acme',
      id: 'idp:design-tool:1',
      source: 'idp',
      sourceReference: 'application/design-tool',
      vendorName: 'Design Tool',
      observedAt: '2026-06-03T00:00:00.000Z',
      activityCount: 1,
      identityType: 'service_account',
    });

    const policies = new DiscoveryReviewPolicyManager(discovery);
    await expect(policies.list('acme')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          policyId: 'application-owner.v1',
          evidence: [{ sourceReference: 'design tool', observedAt: '2026-06-02T00:00:00.000Z' }],
        }),
        expect.objectContaining({
          policyId: 'non-human-identity.v1',
          evidence: [
            { sourceReference: 'application/design-tool', observedAt: '2026-06-03T00:00:00.000Z' },
          ],
        }),
      ]),
    );

    const audit = new InMemoryAuditLedger();
    const campaigns = new PolicyReviewCampaignManager(
      policies,
      new InMemoryReviewCampaignRepository(),
      audit,
      () => new Date('2026-07-14T16:00:00.000Z'),
    );
    const campaign = await campaigns.create('acme', {
      title: 'Application owner review',
      policyIds: ['application-owner.v1'],
      fallbackReviewer: 'governance@acme.dev',
      actor: 'admin@acme.dev',
    });

    expect(campaign.tasks).toMatchObject([
      {
        policy: {
          policyId: 'application-owner.v1',
          subjectId: 'design-tool',
          evidence: [{ sourceReference: 'design tool', observedAt: '2026-06-02T00:00:00.000Z' }],
        },
        route: 'fallback_reviewer',
      },
    ]);
    await expect(audit.list('acme')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'review.policy.evaluated',
          data: expect.objectContaining({ providerMutation: false }),
        }),
      ]),
    );
  });
});

describe('policy review API', () => {
  it('exposes recommendations and creates a read-only policy campaign', async () => {
    const discovery = new CatalogDiscoveryManager(
      new InMemorySaasCatalogRepository(),
      new InMemoryDiscoveryRepository(),
    );
    await discovery.createCatalog({
      tenantId: 'acme',
      id: 'slack',
      vendorName: 'Slack',
      normalizedName: 'slack',
      domains: ['slack.com'],
      aliases: [],
      category: 'collaboration',
      riskTier: 'high',
      dataClassification: 'confidential',
      recommendation: 'monitor',
      owners: [],
      approvedAlternatives: [],
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });
    const policies = new DiscoveryReviewPolicyManager(discovery);
    const campaigns = new PolicyReviewCampaignManager(
      policies,
      new InMemoryReviewCampaignRepository(),
      new InMemoryAuditLedger(),
      () => new Date('2026-07-14T16:00:00.000Z'),
    );
    const app = createApp(new InMemoryAccessGraphRepository(), {
      discovery,
      reviewPolicies: policies,
      policyCampaigns: campaigns,
    });

    expect((await app.inject('/v1/tenants/acme/review-policies')).json()).toMatchObject([
      { policyId: 'application-owner.v1', evidence: [{ sourceReference: 'slack.com' }] },
    ]);
    const created = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/policy-review-campaigns',
      payload: {
        title: 'Slack ownership',
        policyIds: ['application-owner.v1'],
        actor: 'admin@acme.dev',
      },
    });
    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({
      title: 'Slack ownership',
      tasks: [{ policy: { policyId: 'application-owner.v1' } }],
    });
    await app.close();
  });
});
