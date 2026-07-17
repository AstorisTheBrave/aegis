import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import {
  CONNECTOR_PROTOCOL_VERSION,
  ExtensionRegistry,
  InMemoryExtensionRegistryRepository,
  signArtifact,
  type SignedExtensionArtifact,
} from '@aegis/extension-registry';
import { VerifiedExtensionRegistryManager } from '../src/extensions.js';
import { createApp } from '../src/app.js';

describe('verified extension installation', () => {
  it('installs a signed read-only connector and rejects unsigned input', async () => {
    const keys = generateKeyPairSync('ed25519');
    const artifact = signArtifact(
      {
        id: 'example-community-connector',
        version: '1.0.0',
        kind: 'connector',
        publishedAt: '2026-07-14T00:00:00.000Z',
        maintainer: { name: 'Community Maintainer', contact: 'security@example.test' },
        protocolVersion: CONNECTOR_PROTOCOL_VERSION,
        governance: {
          protocolVersions: [CONNECTOR_PROTOCOL_VERSION],
          platform: { minimum: '1.0.0', maximum: '1.0.0' },
          provenance: {
            sourceRevision: 'git:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            buildDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            testedAt: '2026-07-14T00:00:00.000Z',
            testStatus: 'passed',
          },
          lifecycle: { status: 'active' },
        },
        content: {
          manifest: {
            protocolVersion: CONNECTOR_PROTOCOL_VERSION,
            id: 'example-community-connector',
            vendor: 'Example Provider',
            capabilities: ['IDENTITY_READ'],
            authenticationModes: ['OAUTH2'],
            minimumScopes: ['users.read'],
            imageDigest:
              'ghcr.io/aegis/example@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
          certification: {
            status: 'fixture_certified',
            fixtureDigest: 'sha256:fixture',
            requestMethods: ['GET'],
            endpointInventory: ['https://api.example.test/users'],
            noWriteProof: true,
            scopeReview: {
              status: 'self_attested',
              reviewer: 'Community Maintainer',
              reviewedAt: '2026-07-14T00:00:00.000Z',
            },
            certifiedAt: '2026-07-14T00:00:00.000Z',
          },
        },
      },
      keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      keys.privateKey,
    );
    const app = createApp(new InMemoryAccessGraphRepository(), {
      extensions: new VerifiedExtensionRegistryManager(
        new ExtensionRegistry(new InMemoryExtensionRegistryRepository()),
      ),
    });
    const installed = await app.inject({
      method: 'POST',
      url: '/v1/extensions',
      payload: artifact,
    });
    expect(installed.statusCode).toBe(200);
    expect(installed.json()).toMatchObject({
      id: 'example-community-connector',
      kind: 'connector',
    });
    expect((await app.inject('/v1/extensions?kind=connector')).json()).toMatchObject([
      {
        certificationStatus: 'fixture_certified',
        permissions: ['users.read'],
        governanceStatus: 'verified',
        lifecycle: { status: 'active' },
        provenance: { testStatus: 'passed' },
      },
    ]);
    expect(
      (await app.inject({ method: 'POST', url: '/v1/extensions', payload: {} })).statusCode,
    ).toBe(400);
    await app.close();
  });

  it('lists legacy signed artifacts as unverified instead of failing the catalog', async () => {
    const keys = generateKeyPairSync('ed25519');
    const current = signArtifact(
      {
        id: 'legacy-policy-pack',
        version: '1.0.0',
        kind: 'policy-pack',
        publishedAt: '2026-07-14T00:00:00.000Z',
        maintainer: { name: 'Community Maintainer', contact: 'security@example.test' },
        protocolVersion: CONNECTOR_PROTOCOL_VERSION,
        governance: {
          protocolVersions: [CONNECTOR_PROTOCOL_VERSION],
          platform: { minimum: '1.0.0' },
          provenance: {
            sourceRevision: 'git:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            buildDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            testedAt: '2026-07-14T00:00:00.000Z',
            testStatus: 'passed',
          },
          lifecycle: { status: 'active' },
        },
        content: { controls: ['review'], rules: [] },
      },
      keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      keys.privateKey,
    );
    const { governance: _governance, ...legacyPayload } = current.payload;
    const legacy = { ...current, payload: legacyPayload } as unknown as SignedExtensionArtifact;
    const registry = new ExtensionRegistry({
      install: async () => undefined,
      list: async () => [legacy],
    });

    await expect(new VerifiedExtensionRegistryManager(registry).list()).resolves.toEqual([
      expect.objectContaining({
        id: 'legacy-policy-pack',
        governanceStatus: 'legacy_unverified',
      }),
    ]);
  });
});
