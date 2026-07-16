import { certifyReadOnlyConnector } from '@aegis/connector-test-kit';
import { describe, expect, it } from 'vitest';
import { officialConnectorProfiles } from '../src/index.js';

describe('official connector fixture certifications', () => {
  it('certifies a GET-only representative fixture for every catalog profile', () => {
    const certifications = officialConnectorProfiles.map((profile) =>
      certifyReadOnlyConnector(
        {
          protocolVersion: '1.0.0',
          id: profile.id,
          vendor: profile.vendor,
          capabilities: ['IDENTITY_READ', 'ACCESS_GRAPH_READ'],
          authenticationModes: profile.authentication,
          minimumScopes: profile.minimumReadScopes,
          imageDigest: `ghcr.io/aegis/${profile.id}@sha256:${'a'.repeat(64)}`,
        },
        {
          provider: profile.id,
          exchanges: profile.readEndpoints.map((endpoint) => ({
            method: 'GET',
            url: fixtureUrl(endpoint),
            requestHeaders: { Authorization: 'Bearer fixture-secret' },
            responseStatus: 200,
            responseBody: { items: [] },
          })),
        },
        '2026-07-16T00:00:00.000Z',
      ),
    );
    expect(certifications).toHaveLength(12);
    expect(certifications.every((certification) => certification.noWriteProof)).toBe(true);
  });
});

function fixtureUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/operations/${endpoint}`;
  return `https://fixtures.aegis.test${path.replace(/:[a-z]+/gi, 'example').replaceAll(' ', '-')}`;
}
