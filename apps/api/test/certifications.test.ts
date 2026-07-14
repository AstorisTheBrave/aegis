import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { InMemoryActionRepository } from '@aegis/action-engine';
import { InMemoryProviderCertificationRepository } from '@aegis/provider-certification';
import { ActionManager } from '../src/actions.js';
import { createApp } from '../src/app.js';
import { ProviderCertificationManager } from '../src/certifications.js';

const activation = {
  provider: 'mock-okta',
  environment: 'test',
  allowedActionKinds: ['disable_account'],
  grantedScopes: ['users.disable'],
  activatedBy: 'operator@acme.dev',
  expiresAt: '2026-07-15T20:00:00.000Z',
};

describe('provider certification API', () => {
  it('requires a test activation before a configured action manager executes and records certification evidence', async () => {
    const audit = new InMemoryAuditLedger();
    const certifications = new ProviderCertificationManager(
      new InMemoryProviderCertificationRepository(),
      audit,
      () => new Date('2026-07-14T20:00:00.000Z'),
    );
    const app = createApp(new InMemoryAccessGraphRepository(), {
      certifications,
      actions: new ActionManager(
        new InMemoryActionRepository(),
        audit,
        undefined,
        certifications.activationRegistry,
      ),
    });
    const requested = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/actions',
      payload: {
        provider: 'mock-okta',
        kind: 'disable_account',
        target: { subjectId: 'person:alice', displayName: 'Alice Example' },
        requestedBy: 'requester@acme.dev',
        requiredScopes: ['users.disable'],
        idempotencyKey: 'phase-7:alice:okta',
        rollbackNarrative: 'Re-enable the mock account.',
      },
    });
    const actionId = (requested.json() as { id: string }).id;
    await app.inject({
      method: 'POST',
      url: `/v1/tenants/acme/actions/${actionId}/approve`,
      payload: { approver: 'approver@acme.dev', reason: 'Approved test action.' },
    });
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/tenants/acme/actions/${actionId}/execute`,
          payload: { executor: 'executor@acme.dev' },
        })
      ).statusCode,
    ).toBe(400);
    const activated = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/test-activations',
      payload: activation,
    });
    expect(activated.statusCode).toBe(200);
    expect((await app.inject('/v1/tenants/acme/test-activations')).json()).toMatchObject([
      { environment: 'test', provider: 'mock-okta' },
    ]);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/tenants/acme/actions/${actionId}/execute`,
          payload: { executor: 'executor@acme.dev' },
        })
      ).json(),
    ).toMatchObject({ status: 'completed', providerMutation: false });
    const certified = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/provider-certifications',
      payload: {
        activationId: (activated.json() as { id: string }).id,
        certifiedBy: 'reviewer@acme.dev',
        manifest: {
          protocolVersion: '1.0.0',
          id: 'mock-okta-fixture',
          vendor: 'Mock Okta',
          capabilities: ['IDENTITY_READ'],
          authenticationModes: ['API_TOKEN'],
          minimumScopes: ['users.read'],
          imageDigest:
            'ghcr.io/aegis/mock-okta@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
        fixture: {
          provider: 'mock-okta',
          exchanges: [
            {
              method: 'GET',
              url: 'https://mock.okta.test/users',
              responseStatus: 200,
              responseBody: [],
            },
          ],
        },
        actionProbes: [{ kind: 'disable_account', requiredScopes: ['users.disable'] }],
      },
    });
    expect(certified.statusCode).toBe(200);
    expect((await app.inject('/v1/tenants/acme/provider-certifications')).json()).toMatchObject([
      { status: 'test_tenant_certified', providerMutation: false },
    ]);
    await app.close();
  });

  it('rejects non-test activations and write fixtures', async () => {
    const audit = new InMemoryAuditLedger();
    const certifications = new ProviderCertificationManager(
      new InMemoryProviderCertificationRepository(),
      audit,
    );
    const app = createApp(new InMemoryAccessGraphRepository(), { certifications });
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/tenants/acme/test-activations',
          payload: { ...activation, environment: 'production' },
        })
      ).statusCode,
    ).toBe(400);
    await app.close();
  });
});
