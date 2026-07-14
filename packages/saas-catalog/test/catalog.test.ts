import { describe, expect, it } from 'vitest';
import { InMemorySaasCatalogRepository } from '../src/index.js';

describe('SaaS catalog', () => {
  it('normalizes vendor evidence and keeps owner assignments deterministic', async () => {
    const catalog = new InMemorySaasCatalogRepository();
    const application = await catalog.upsert({
      tenantId: 'acme',
      id: 'slack',
      vendorName: 'Slack',
      normalizedName: 'Slack',
      domains: ['https://www.slack.com'],
      aliases: ['Slack Technologies'],
      category: 'Collaboration',
      riskTier: 'high',
      dataClassification: 'confidential',
      recommendation: 'allow',
      owners: [
        { identityId: 'owner:tech', role: 'technical', assignedAt: '2026-07-14T00:00:00.000Z' },
        { identityId: 'owner:business', role: 'business', assignedAt: '2026-07-14T00:00:00.000Z' },
      ],
      approvedAlternatives: ['Mattermost'],
      renewalAt: '2027-01-01T00:00:00.000Z',
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z',
    });
    expect(application.domains).toEqual(['slack.com']);
    expect(application.aliases).toEqual(['slack technologies']);
    expect(application.owners.map((owner) => owner.role)).toEqual(['business', 'technical']);
  });

  it('rejects duplicate owner assignments and unmatchable applications', async () => {
    const catalog = new InMemorySaasCatalogRepository();
    await expect(
      catalog.upsert({
        tenantId: 'acme',
        id: 'bad',
        vendorName: 'Bad',
        normalizedName: 'bad',
        domains: [],
        aliases: [],
        category: 'Other',
        riskTier: 'low',
        dataClassification: 'internal',
        recommendation: 'monitor',
        owners: [],
        approvedAlternatives: [],
        createdAt: '2026-07-14T00:00:00.000Z',
        updatedAt: '2026-07-14T00:00:00.000Z',
      }),
    ).rejects.toThrow('domain or alias');
  });
});
