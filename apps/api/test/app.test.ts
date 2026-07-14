import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import type { ApiServices } from '../src/app.js';
import { createApp } from '../src/app.js';

async function createGraph() {
  const graph = new InMemoryAccessGraphRepository();
  await graph.applySync({
    tenantId: 'acme',
    connectorId: 'github',
    startedAt: '2025-06-14T10:00:00.000Z',
    completedAt: '2025-06-14T10:01:00.000Z',
    events: [
      {
        type: 'identity.upsert',
        entity: {
          kind: 'identity',
          tenantId: 'acme',
          connectorId: 'github',
          id: 'alice',
          externalId: '100',
          displayName: 'Alice Example',
          email: 'alice@example.dev',
          status: 'ACTIVE',
          observedAt: '2025-06-14T10:00:00.000Z',
          attributes: { source: 'GitHub', sourceAccount: 'acme', platform: 'acme/platform' },
        },
      },
    ],
  });
  return graph;
}

const services: ApiServices = {
  findings: {
    async get(_tenantId, findingId) {
      return findingId === 'PRV-2025-00073'
        ? {
            id: findingId,
            severity: 'high',
            title: 'Privileged access requires review',
            identity: 'Alice Example',
            source: 'GitHub (acme)',
            resource: 'acme/platform',
            access: 'Maintain',
            policy: 'Privileged access requires review',
            firstSeen: '14 Jun 2025',
            lastSeen: '1h ago',
            status: 'open',
            evidence: [
              { id: 'evt_1', kind: 'RoleBinding', title: 'cluster-admin', detail: 'Privileged' },
            ],
          }
        : undefined;
    },
  },
  reviews: {
    async record(_tenantId, itemId, input) {
      return { itemId, ...input, recordedAt: '2025-06-14T10:00:00.000Z' };
    },
  },
  evidence: {
    async export(tenantId) {
      return { tenantId, exportedAt: '2025-06-14T10:00:00.000Z', records: [], sha256: 'abc123' };
    },
  },
};

describe('Aegis API', () => {
  it('serves health, inventory search, and scoped missing identities', async () => {
    const app = createApp(await createGraph(), services);
    expect((await app.inject('/health')).json()).toEqual({ status: 'ok' });
    expect((await app.inject('/v1/tenants/acme/identities?query=alice')).json()).toMatchObject([
      { id: 'alice', displayName: 'Alice Example', source: 'GitHub' },
    ]);
    expect((await app.inject('/v1/tenants/t/identities/nope')).statusCode).toBe(404);
    await app.close();
  });

  it('exposes typed finding, review, and evidence contracts without provider mutation', async () => {
    const app = createApp(await createGraph(), services);
    expect((await app.inject('/v1/tenants/acme/findings/PRV-2025-00073')).json()).toMatchObject({
      severity: 'high',
      evidence: [{ kind: 'RoleBinding' }],
    });
    const decision = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/reviews/review:PRV-2025-00073/decisions',
      payload: { decision: 'revocation_requested', comment: 'No longer needed.' },
    });
    expect(decision.statusCode).toBe(200);
    expect(decision.json()).toMatchObject({
      decision: 'revocation_requested',
      itemId: 'review:PRV-2025-00073',
    });
    expect((await app.inject('/v1/tenants/acme/evidence/export')).json()).toMatchObject({
      tenantId: 'acme',
      sha256: 'abc123',
    });
    await app.close();
  });

  it('does not silently enable unconfigured governance services', async () => {
    const app = createApp(await createGraph());
    expect((await app.inject('/v1/tenants/acme/findings/PRV-2025-00073')).statusCode).toBe(501);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/tenants/acme/reviews/review:PRV-2025-00073/decisions',
          payload: { decision: 'approved', comment: '' },
        })
      ).statusCode,
    ).toBe(501);
    await app.close();
  });
});
