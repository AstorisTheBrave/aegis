import { createHash } from 'node:crypto';
import type { ConnectorCertification } from '@aegis/extension-registry';
import { canonicalJson } from '@aegis/extension-registry';
import { parseManifest, type ConnectorManifest } from '@open-saas-governance/connector-protocol';

export interface RecordedHttpExchange {
  readonly method: string;
  readonly url: string;
  readonly requestHeaders?: Readonly<Record<string, string>>;
  readonly requestBody?: unknown;
  readonly responseStatus: number;
  readonly responseBody: unknown;
}

export interface FixtureBundle {
  readonly provider: string;
  readonly exchanges: readonly RecordedHttpExchange[];
}

const sensitiveKey = /authorization|cookie|secret|password|token|api[-_]?key/i;
const tokenLike = /(?:bearer\s+|gh[pousr]_[a-zA-Z0-9_-]+|xox[baprs]-[a-zA-Z0-9-]+)/gi;

export function redactFixture<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redactFixture) as T;
  if (typeof value === 'string') return value.replace(tokenLike, 'REDACTED') as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        sensitiveKey.test(key) ? 'REDACTED' : redactFixture(nested),
      ]),
    ) as T;
  }
  return value;
}

export function certifyReadOnlyConnector(
  manifest: ConnectorManifest,
  fixture: FixtureBundle,
  certifiedAt: string,
): ConnectorCertification {
  parseManifest(manifest);
  const methods = [...new Set(fixture.exchanges.map((exchange) => exchange.method.toUpperCase()))];
  if (!methods.every((method) => method === 'GET' || method === 'HEAD')) {
    throw new Error('Fixture contains a non-read-only provider request');
  }
  const redacted = redactFixture(fixture);
  if (canonicalJson(redacted).includes('Bearer ') || canonicalJson(redacted).includes('xox')) {
    throw new Error('Fixture redaction did not remove a credential-like value');
  }
  return {
    status: 'fixture_certified',
    fixtureDigest: `sha256:${createHash('sha256').update(canonicalJson(redacted)).digest('hex')}`,
    requestMethods: methods as ('GET' | 'HEAD')[],
    endpointInventory: [...new Set(fixture.exchanges.map((exchange) => exchange.url))].sort(),
    noWriteProof: true,
    scopeReview: {
      status: 'self_attested',
      reviewer: manifest.id,
      reviewedAt: certifiedAt,
    },
    certifiedAt,
  };
}

export function createMockProvider(fixture: FixtureBundle): typeof fetch {
  let cursor = 0;
  return async (input, init) => {
    const expected = fixture.exchanges[cursor++];
    const method = (init?.method ?? 'GET').toUpperCase();
    const url = String(input);
    if (!expected || expected.method.toUpperCase() !== method || expected.url !== url) {
      throw new Error(`Fixture replay mismatch for ${method} ${url}`);
    }
    return new Response(JSON.stringify(expected.responseBody), {
      status: expected.responseStatus,
      headers: { 'content-type': 'application/json' },
    });
  };
}
