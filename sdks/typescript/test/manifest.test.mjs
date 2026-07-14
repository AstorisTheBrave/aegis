import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertReadOnlyManifest, redactFixture } from '../dist/index.js';

test('validates read-only connector manifests and redacts fixture secrets', () => {
  const manifest = JSON.parse(readFileSync('sdks/fixtures/connector-v1-manifest.json', 'utf8'));
  assert.doesNotThrow(() => assertReadOnlyManifest(manifest));
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
