import { describe, expect, it } from 'vitest';
import { MockActionAdapter } from '@aegis/action-engine';
import {
  certifyTestTenantProvider,
  InMemoryProviderCertificationRepository,
  TestTenantActivationRegistry,
} from '../src/index.js';

const now = () => new Date('2026-07-14T20:00:00.000Z');
const manifest = {
  protocolVersion: '1.0.0' as const,
  id: 'mock-okta-fixture',
  vendor: 'Mock Okta',
  capabilities: ['IDENTITY_READ'] as const,
  authenticationModes: ['API_TOKEN'] as const,
  minimumScopes: ['users.read'],
  imageDigest:
    'ghcr.io/aegis/mock-okta@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};
const fixture = {
  provider: 'mock-okta',
  exchanges: [
    { method: 'GET', url: 'https://mock.okta.test/users', responseStatus: 200, responseBody: [] },
  ],
};

describe('test-tenant provider certification', () => {
  it('certifies a redacted read-only fixture and authorizes only its declared action scope', async () => {
    const repository = new InMemoryProviderCertificationRepository();
    const registry = new TestTenantActivationRegistry(repository, now, () => 'activation-1');
    const activation = await registry.activate('acme', {
      provider: 'mock-okta',
      environment: 'test',
      allowedActionKinds: ['disable_account'],
      grantedScopes: ['users.disable'],
      activatedBy: 'operator@acme.dev',
      expiresAt: '2026-07-15T20:00:00.000Z',
    });
    const certified = await certifyTestTenantProvider(
      repository,
      registry,
      'acme',
      {
        activationId: activation.id,
        manifest,
        fixture,
        adapter: new MockActionAdapter('mock-okta', ['disable_account']),
        actionProbes: [{ kind: 'disable_account', requiredScopes: ['users.disable'] }],
        certifiedBy: 'reviewer@acme.dev',
      },
      now,
      () => 'certificate-1',
    );
    expect(certified).toMatchObject({
      status: 'test_tenant_certified',
      providerMutation: false,
      fixtureDigest: expect.stringMatching(/^sha256:/),
    });
    await expect(
      registry.authorize('acme', 'mock-okta', 'revoke_sessions', ['users.disable']),
    ).rejects.toThrow('does not allow action');
  });

  it('rejects expired activations, missing scopes, and write fixtures', async () => {
    const repository = new InMemoryProviderCertificationRepository();
    const registry = new TestTenantActivationRegistry(repository, now, () => 'activation-2');
    await expect(
      registry.activate('acme', {
        provider: 'mock-okta',
        environment: 'test',
        allowedActionKinds: ['disable_account'],
        grantedScopes: ['users.disable'],
        activatedBy: 'operator@acme.dev',
        expiresAt: '2026-07-14T19:00:00.000Z',
      }),
    ).rejects.toThrow('future expiry');
    const activation = await registry.activate('acme', {
      provider: 'mock-okta',
      environment: 'test',
      allowedActionKinds: ['disable_account'],
      grantedScopes: ['users.disable'],
      activatedBy: 'operator@acme.dev',
      expiresAt: '2026-07-15T20:00:00.000Z',
    });
    await expect(
      registry.authorize('acme', 'mock-okta', 'disable_account', ['users.read']),
    ).rejects.toThrow('does not grant required scopes');
    await expect(
      certifyTestTenantProvider(repository, registry, 'acme', {
        activationId: activation.id,
        manifest,
        fixture: { ...fixture, exchanges: [{ ...fixture.exchanges[0], method: 'POST' }] },
        adapter: new MockActionAdapter('mock-okta', ['disable_account']),
        actionProbes: [{ kind: 'disable_account', requiredScopes: ['users.disable'] }],
        certifiedBy: 'reviewer@acme.dev',
      }),
    ).rejects.toThrow('non-read-only');
  });
});
