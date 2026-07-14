import { describe, expect, it } from 'vitest';
import { InMemorySaasCatalogRepository } from '@aegis/saas-catalog';
import { InMemoryDiscoveryRepository, reconcileDiscovery } from '../src/index.js';

describe('discovery reconciliation', () => {
  it('matches a read-only observation by domain and surfaces risk, usage, and non-human evidence', async () => {
    const catalog = new InMemorySaasCatalogRepository();
    await catalog.upsert({
      tenantId: 'acme',
      id: 'slack',
      vendorName: 'Slack',
      normalizedName: 'slack',
      domains: ['slack.com'],
      aliases: [],
      category: 'Collaboration',
      riskTier: 'high',
      dataClassification: 'confidential',
      recommendation: 'block_recommended',
      owners: [],
      approvedAlternatives: [],
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z',
    });
    const observation = {
      tenantId: 'acme',
      id: 'browser:slack',
      source: 'browser_extension' as const,
      sourceReference: 'browser-extension:aggregate:1',
      vendorName: 'Other',
      domain: 'https://www.slack.com',
      observedAt: '2026-07-14T00:00:00.000Z',
      activityCount: 0,
      identityType: 'bot' as const,
    };
    const item = await reconcileDiscovery(observation, catalog);
    expect(item.application?.id).toBe('slack');
    expect(item.reasons).toEqual([
      'missing_owner',
      'high_risk',
      'unused_license',
      'non_human_access',
    ]);
    expect(item.recommendation).toBe('block_recommended');
  });

  it('accepts every normalized source kind and rejects credential-shaped metadata', async () => {
    const repository = new InMemoryDiscoveryRepository();
    for (const source of [
      'idp',
      'finance',
      'sso_log',
      'browser_extension',
      'endpoint_inventory',
      'email_domain',
      'api_token_inventory',
    ] as const) {
      await repository.record({
        tenantId: 'acme',
        id: source,
        source,
        sourceReference: `source:${source}`,
        vendorName: source,
        observedAt: '2026-07-14T00:00:00.000Z',
        activityCount: 1,
      });
    }
    expect(await repository.list('acme')).toHaveLength(7);
    await expect(
      repository.record({
        tenantId: 'acme',
        id: 'bad',
        source: 'idp',
        sourceReference: 'idp:bad',
        vendorName: 'Bad',
        observedAt: '2026-07-14T00:00:00.000Z',
        activityCount: 1,
        metadata: { apiToken: 'never-store' },
      }),
    ).rejects.toThrow('credential-shaped');
  });
});
