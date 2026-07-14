import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { InMemoryAccessRequestRepository } from '@aegis/access-requests';
import { AccessRequestManager } from '../src/access-requests.js';
import { createApp } from '../src/app.js';
describe('access request API', () => {
  it('records a bounded request and a distinct approval without provider mutation', async () => {
    const audit = new InMemoryAuditLedger();
    const app = createApp(new InMemoryAccessGraphRepository(), {
      accessRequests: new AccessRequestManager(new InMemoryAccessRequestRepository(), audit),
    });
    const created = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/access-requests',
      payload: {
        catalogItemId: 'github-maintain',
        requester: 'user@acme.dev',
        rationale: 'Incident investigation',
        durationMinutes: 60,
        idempotencyKey: 'request:1',
      },
    });
    expect(created.statusCode).toBe(200);
    const id = (created.json() as { id: string }).id;
    const retry = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/access-requests',
      payload: {
        catalogItemId: 'github-maintain',
        requester: 'user@acme.dev',
        rationale: 'Incident investigation',
        durationMinutes: 60,
        idempotencyKey: 'request:1',
      },
    });
    expect((retry.json() as { id: string }).id).toBe(id);
    expect((await audit.list('acme')).map((record) => record.type)).toEqual([
      'access_request.created',
    ]);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/tenants/acme/access-requests/${id}/decisions`,
          payload: {
            reviewer: 'resource-owner@acme.dev',
            approved: true,
            reason: 'Time-bounded investigation approved',
          },
        })
      ).json(),
    ).toMatchObject({ status: 'approved', simulatedFulfillment: { providerMutation: false } });
    expect(
      (
        await app.inject({ method: 'POST', url: `/v1/tenants/acme/access-requests/${id}/activate` })
      ).json(),
    ).toMatchObject({
      status: 'active',
      simulatedFulfillment: { providerMutation: false, requiresControlledAction: true },
    });
    expect((await audit.list('acme')).map((record) => record.type)).toEqual([
      'access_request.created',
      'access_request.approved',
      'access_request.activated',
    ]);
    await app.close();
  });
});
