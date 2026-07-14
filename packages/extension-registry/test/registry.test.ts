import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CONNECTOR_PROTOCOL_VERSION,
  ExtensionRegistry,
  InMemoryExtensionRegistryRepository,
  signArtifact,
  type ExtensionArtifactPayload,
  type SignedExtensionArtifact,
} from '../src/index.js';

function artifact(overrides: Partial<ExtensionArtifactPayload> = {}): SignedExtensionArtifact {
  const keys = generateKeyPairSync('ed25519');
  const payload: ExtensionArtifactPayload = {
    id: 'github-community',
    version: '1.0.0',
    kind: 'connector',
    publishedAt: '2026-07-14T00:00:00.000Z',
    maintainer: { name: 'Aegis Community', contact: 'security@example.test' },
    protocolVersion: CONNECTOR_PROTOCOL_VERSION,
    content: {
      manifest: {
        protocolVersion: CONNECTOR_PROTOCOL_VERSION,
        id: 'github-community',
        vendor: 'GitHub',
        capabilities: ['IDENTITY_READ', 'ACCESS_GRAPH_READ'],
        authenticationModes: ['APP_INSTALLATION'],
        minimumScopes: ['members:read'],
        imageDigest:
          'ghcr.io/aegis/github@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
      certification: {
        status: 'fixture_certified',
        fixtureDigest: 'sha256:fixture',
        requestMethods: ['GET'],
        endpointInventory: ['/orgs/acme/members'],
        noWriteProof: true,
        scopeReview: {
          status: 'maintainer_reviewed',
          reviewer: 'Aegis security',
          reviewedAt: '2026-07-14T00:00:00.000Z',
        },
        certifiedAt: '2026-07-14T00:00:00.000Z',
      },
    },
    ...overrides,
  };
  return signArtifact(
    payload,
    keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    keys.privateKey,
  );
}

describe('ExtensionRegistry', () => {
  it('installs only signed, read-only artifacts and returns a deterministic catalog', async () => {
    const registry = new ExtensionRegistry(new InMemoryExtensionRegistryRepository());
    const beta = artifact({ id: 'slack-community' });
    const alpha = artifact();
    await registry.install(beta);
    await registry.install(alpha);
    expect((await registry.list()).map((entry) => entry.payload.id)).toEqual([
      'github-community',
      'slack-community',
    ]);
    await expect(registry.install(alpha)).rejects.toThrow('already installed');
  });

  it('rejects tampered and write-capable connector artifacts', async () => {
    const registry = new ExtensionRegistry(new InMemoryExtensionRegistryRepository());
    const tampered = artifact({ version: '1.0.1' });
    await expect(registry.install({ ...tampered, digest: 'sha256:tampered' })).rejects.toThrow(
      'digest',
    );
    const writable = artifact();
    const connector = writable.payload.content as { manifest: { capabilities: string[] } };
    connector.manifest.capabilities.push('ACTION_WRITE');
    await expect(registry.install(writable)).rejects.toThrow('digest');
  });
});
