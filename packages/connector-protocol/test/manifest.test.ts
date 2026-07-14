import { describe, expect, it } from 'vitest';

import { CONNECTOR_PROTOCOL_VERSION, parseManifest, readOnlyCapabilities } from '../src/index.js';

const readOnlyGithubManifest = {
  protocolVersion: CONNECTOR_PROTOCOL_VERSION,
  id: 'github-cloud',
  vendor: 'GitHub',
  capabilities: ['IDENTITY_READ', 'ACCESS_GRAPH_READ', 'USAGE_READ'],
  authenticationModes: ['APP_INSTALLATION'],
  minimumScopes: ['members:read', 'organization_administration:read'],
  imageDigest:
    'ghcr.io/open-saas-governance/connector-github@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

describe('parseManifest', () => {
  it('accepts a complete read-only connector manifest', () => {
    expect(parseManifest(readOnlyGithubManifest).capabilities).toEqual(readOnlyCapabilities);
  });

  it('rejects a connector that declares a provider mutation capability', () => {
    expect(() =>
      parseManifest({
        ...readOnlyGithubManifest,
        capabilities: [...readOnlyGithubManifest.capabilities, 'ACTION_WRITE'],
      }),
    ).toThrow('protocol v1 is read-only and does not permit: ACTION_WRITE');
  });

  it('rejects an unpinned connector image', () => {
    expect(() =>
      parseManifest({
        ...readOnlyGithubManifest,
        imageDigest: 'ghcr.io/open-saas-governance/connector-github:latest',
      }),
    ).toThrow('imageDigest must be an OCI image reference pinned to a sha256 digest');
  });

  it('rejects duplicate capabilities', () => {
    expect(() =>
      parseManifest({
        ...readOnlyGithubManifest,
        capabilities: ['IDENTITY_READ', 'IDENTITY_READ'],
      }),
    ).toThrow('capabilities must not repeat values: IDENTITY_READ');
  });
});
