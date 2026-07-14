import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReadOnlyManifest, redactFixture } from '../dist/index.js';

test('validates read-only connector manifests and redacts fixture secrets', () => {
  assert.doesNotThrow(() =>
    assertReadOnlyManifest({
      protocolVersion: '1.0.0',
      id: 'example-connector',
      capabilities: ['IDENTITY_READ'],
      minimumScopes: ['users.read'],
    }),
  );
  assert.deepEqual(redactFixture({ authorization: 'Bearer secret', nested: { token: 'secret' } }), {
    authorization: 'REDACTED',
    nested: { token: 'REDACTED' },
  });
  assert.throws(
    () =>
      assertReadOnlyManifest({
        protocolVersion: '1.0.0',
        id: 'unsafe-connector',
        capabilities: ['ACTION_WRITE'],
        minimumScopes: ['users.write'],
      }),
    /cannot declare write capabilities/,
  );
});
