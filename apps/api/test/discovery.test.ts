import { describe, expect, it } from 'vitest';
import { InMemoryDiscoveryRepository } from '@aegis/discovery';
import { InMemorySaasCatalogRepository } from '@aegis/saas-catalog';
import { CatalogDiscoveryManager } from '../src/discovery.js';

describe('CatalogDiscoveryManager', () => {
  it('reconciles catalog entries and preserves read-only observation evidence', async () => {
    const manager = new CatalogDiscoveryManager(
      new InMemorySaasCatalogRepository(),
      new InMemoryDiscoveryRepository(),
    );
    await manager.createCatalog({
      tenantId: 'acme',
      id: 'slack',
      vendorName: 'Slack',
      normalizedName: 'slack',
      domains: ['slack.com'],
      aliases: ['slack technologies'],
      category: 'collaboration',
      riskTier: 'high',
      dataClassification: 'confidential',
      recommendation: 'monitor',
      owners: [],
      approvedAlternatives: ['Mattermost'],
      createdAt: '2026-07-14T12:00:00.000Z',
      updatedAt: '2026-07-14T12:00:00.000Z',
    });

    await expect(
      manager.observe({
        tenantId: 'acme',
        id: 'idp:slack:1',
        source: 'idp',
        sourceReference: 'application/slack',
        vendorName: 'Slack',
        domain: 'https://www.slack.com',
        observedAt: '2026-07-14T12:01:00.000Z',
        activityCount: 0,
        identityType: 'oauth_application',
        metadata: { clientKind: 'browser' },
      }),
    ).resolves.toMatchObject({
      application: { id: 'slack' },
      reasons: ['missing_owner', 'high_risk', 'unused_license', 'non_human_access'],
      recommendation: 'monitor',
      usage: { source: 'idp', activityCount: 0 },
    });
  });
});
