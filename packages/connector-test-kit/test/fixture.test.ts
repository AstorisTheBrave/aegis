import { describe, expect, it } from 'vitest';
import {
  assertConformantGraphBatch,
  certifyReadOnlyConnector,
  createMockProvider,
  redactFixture,
} from '../src/index.js';

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
          url: 'https://api.example.test/users?access_token=top-secret&sig=signed-secret&X-Amz-Credential=aws-secret&auth=opaque-secret&cursor=ghp_secret&continuation=continue',
          requestHeaders: { Authorization: 'Bearer ghp_secret' },
          responseStatus: 200,
          responseBody: { token: 'xoxb-secret', note: 'Bearer eyJ.fixture.secret', users: [] },
        },
      ],
    };
    expect(redactFixture(fixture)).toMatchObject({
      exchanges: [
        {
          url: 'https://api.example.test/users?access_token=REDACTED&sig=REDACTED&X-Amz-Credential=REDACTED&auth=REDACTED&cursor=REDACTED&continuation=continue',
          requestHeaders: { Authorization: 'REDACTED' },
          responseBody: { token: 'REDACTED', note: 'REDACTED' },
        },
      ],
    });
    expect(certifyReadOnlyConnector(manifest, fixture, '2026-07-14T00:00:00.000Z')).toMatchObject({
      noWriteProof: true,
      requestMethods: ['GET'],
      endpointInventory: [
        'https://api.example.test/users?access_token=REDACTED&sig=REDACTED&X-Amz-Credential=REDACTED&auth=REDACTED&cursor=REDACTED&continuation=continue',
      ],
    });
    const provider = createMockProvider(fixture);
    expect(
      (
        await provider(
          'https://api.example.test/users?access_token=top-secret&sig=signed-secret&X-Amz-Credential=aws-secret&auth=opaque-secret&cursor=ghp_secret&continuation=continue',
        )
      ).status,
    ).toBe(200);
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

  it('rejects missing graph provenance', () => {
    expect(() =>
      assertConformantGraphBatch({
        tenantId: 'one',
        connectorId: 'two',
        startedAt: 'now',
        completedAt: 'now',
        events: [
          {
            type: 'identity.upsert',
            entity: {
              kind: 'identity',
              tenantId: 'other',
              id: 'id',
              connectorId: 'two',
              externalId: 'external',
              displayName: 'Name',
              status: 'ACTIVE',
              observedAt: 'now',
              attributes: { source: 'Fixture' },
            },
          },
        ],
      }),
    ).toThrow('provenance');
  });
});
