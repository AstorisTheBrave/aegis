import { describe, expect, it } from 'vitest';

import { InMemoryAccessGraphRepository, type GraphSyncBatch } from '../src/index.js';

const batch: GraphSyncBatch = {
  tenantId: 'tenant-acme',
  connectorId: 'github-cloud',
  startedAt: '2026-07-14T10:00:00.000Z',
  completedAt: '2026-07-14T10:01:00.000Z',
  events: [
    {
      type: 'identity.upsert',
      entity: {
        kind: 'identity',
        tenantId: 'tenant-acme',
        id: 'identity-alice',
        connectorId: 'github-cloud',
        externalId: '123',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        status: 'ACTIVE',
        observedAt: '2026-07-14T10:00:00.000Z',
        attributes: {},
      },
    },
    {
      type: 'resource.upsert',
      entity: {
        kind: 'resource',
        tenantId: 'tenant-acme',
        id: 'resource-repository',
        connectorId: 'github-cloud',
        externalId: 'acme/platform',
        displayName: 'acme/platform',
        resourceType: 'repository',
        observedAt: '2026-07-14T10:00:00.000Z',
        attributes: {},
      },
    },
    {
      type: 'entitlement.upsert',
      entity: {
        kind: 'entitlement',
        tenantId: 'tenant-acme',
        id: 'entitlement-maintain',
        connectorId: 'github-cloud',
        externalId: 'acme/platform:maintain',
        displayName: 'Maintain',
        resourceId: 'resource-repository',
        entitlementType: 'repository-role',
        privileged: true,
        observedAt: '2026-07-14T10:00:00.000Z',
        attributes: {},
      },
    },
    {
      type: 'grant.upsert',
      entity: {
        kind: 'grant',
        tenantId: 'tenant-acme',
        id: 'grant-alice-maintain',
        connectorId: 'github-cloud',
        externalId: '123:acme/platform:maintain',
        identityId: 'identity-alice',
        entitlementId: 'entitlement-maintain',
        grantType: 'DIRECT',
        observedAt: '2026-07-14T10:00:00.000Z',
        attributes: {},
      },
    },
  ],
};

describe('InMemoryAccessGraphRepository', () => {
  it('returns a complete provider-neutral access view after a sync', async () => {
    const repository = new InMemoryAccessGraphRepository();

    await repository.applySync(batch);

    await expect(repository.getIdentity('tenant-acme', 'identity-alice')).resolves.toMatchObject({
      email: 'alice@example.com',
    });
    await expect(
      repository.listAccessForIdentity('tenant-acme', 'identity-alice'),
    ).resolves.toEqual([
      expect.objectContaining({
        grant: expect.objectContaining({ grantType: 'DIRECT' }),
        entitlement: expect.objectContaining({ privileged: true }),
        resource: expect.objectContaining({ resourceType: 'repository' }),
      }),
    ]);
  });

  it('rejects a grant whose required graph nodes are absent', async () => {
    const repository = new InMemoryAccessGraphRepository();

    await expect(
      repository.applySync({
        ...batch,
        events: [batch.events.at(-1)!],
      }),
    ).rejects.toThrow('Grant grant-alice-maintain references an unknown identity');
  });
});
