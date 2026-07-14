import { describe, expect, it } from 'vitest';
import { InMemoryDiscoveryRepository } from '@aegis/discovery';
import { InMemorySaasCatalogRepository, type SaasCatalogRepository } from '@aegis/saas-catalog';
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

  it('loads the catalog once when reconciling a discovery queue', async () => {
    const repository = new InMemorySaasCatalogRepository();
    let listCalls = 0;
    const catalog: SaasCatalogRepository = {
      upsert: (application) => repository.upsert(application),
      get: (tenantId, id) => repository.get(tenantId, id),
      list: async (tenantId) => {
        listCalls += 1;
        return repository.list(tenantId);
      },
      assignOwners: (tenantId, id, owners, updatedAt) =>
        repository.assignOwners(tenantId, id, owners, updatedAt),
    };
    const observations = new InMemoryDiscoveryRepository();
    const manager = new CatalogDiscoveryManager(catalog, observations);
    await manager.createCatalog({
      tenantId: 'acme',
      id: 'slack',
      vendorName: 'Slack',
      normalizedName: 'slack',
      domains: ['slack.com'],
      aliases: [],
      category: 'collaboration',
      riskTier: 'medium',
      dataClassification: 'internal',
      recommendation: 'monitor',
      owners: [],
      approvedAlternatives: [],
      createdAt: '2026-07-14T12:00:00.000Z',
      updatedAt: '2026-07-14T12:00:00.000Z',
    });
    await observations.record({
      tenantId: 'acme',
      id: 'idp:slack:1',
      source: 'idp',
      sourceReference: 'application/slack:1',
      vendorName: 'Slack',
      observedAt: '2026-07-14T12:01:00.000Z',
      activityCount: 1,
    });
    await observations.record({
      tenantId: 'acme',
      id: 'idp:slack:2',
      source: 'idp',
      sourceReference: 'application/slack:2',
      vendorName: 'Slack',
      observedAt: '2026-07-14T12:02:00.000Z',
      activityCount: 1,
    });
    await manager.listQueue('acme');
    expect(listCalls).toBe(1);
  });
});
