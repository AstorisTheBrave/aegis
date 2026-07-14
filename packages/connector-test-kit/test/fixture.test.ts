import { describe, expect, it } from 'vitest';
import { certifyReadOnlyConnector, createMockProvider, redactFixture } from '../src/index.js';

const manifest = {
  protocolVersion: '1.0.0' as const,
  id: 'fixture-connector',
  vendor: 'Fixture Provider',
  capabilities: ['IDENTITY_READ'] as const,
  authenticationModes: ['API_TOKEN'] as const,
  minimumScopes: ['users.read'],
  imageDigest:
    'ghcr.io/aegis/fixture@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

describe('connector test kit', () => {
  it('redacts credentials and certifies only read-only fixtures', async () => {
    const fixture = {
      provider: 'fixture',
      exchanges: [
        {
          method: 'GET',
          url: 'https://api.example.test/users',
          requestHeaders: { Authorization: 'Bearer ghp_secret' },
          responseStatus: 200,
          responseBody: { token: 'xoxb-secret', users: [] },
        },
      ],
    };
    expect(redactFixture(fixture)).toMatchObject({
      exchanges: [
        { requestHeaders: { Authorization: 'REDACTED' }, responseBody: { token: 'REDACTED' } },
      ],
    });
    expect(certifyReadOnlyConnector(manifest, fixture, '2026-07-14T00:00:00.000Z')).toMatchObject({
      noWriteProof: true,
      requestMethods: ['GET'],
    });
    const provider = createMockProvider(fixture);
    expect((await provider('https://api.example.test/users')).status).toBe(200);
  });

  it('rejects write recordings and replay mismatches', async () => {
    const writeFixture = {
      provider: 'fixture',
      exchanges: [
        {
          method: 'POST',
          url: 'https://api.example.test/users',
          responseStatus: 201,
          responseBody: {},
        },
      ],
    };
    expect(() =>
      certifyReadOnlyConnector(manifest, writeFixture, '2026-07-14T00:00:00.000Z'),
    ).toThrow('non-read-only');
    const provider = createMockProvider({ provider: 'fixture', exchanges: [] });
    await expect(provider('https://api.example.test/users')).rejects.toThrow(
      'Fixture replay mismatch',
    );
  });
});
