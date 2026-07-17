import { createHash } from 'node:crypto';
import type { ConnectorCertification } from '@aegis/extension-registry';
import { canonicalJson } from '@aegis/extension-registry';
import { parseManifest, type ConnectorManifest } from '@open-saas-governance/connector-protocol';
import type { GraphSyncBatch } from '@open-saas-governance/access-graph';

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
const tokenLike = /(?:bearer\s+\S+|gh[pousr]_[a-zA-Z0-9_-]+|xox[baprs]-[a-zA-Z0-9-]+)/gi;
const absoluteUrl = /^[a-z][a-z\d+.-]*:/i;

export function redactFixture<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redactFixture) as T;
  if (typeof value === 'string') return redactString(value) as T;
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

export function redactEndpointUrl(value: string): string {
  const redacted = redactTokenLike(value);
  const reference = classifyUrlReference(redacted);
  if (!reference) throw new TypeError('Value is not a URL reference');

  const url =
    reference.kind === 'absolute'
      ? new URL(redacted)
      : new URL(redacted, 'https://redaction.invalid');
  url.username = '';
  url.password = '';
  for (const [key] of url.searchParams) {
    url.searchParams.set(key, 'REDACTED');
  }
  url.hash = '';

  switch (reference.kind) {
    case 'absolute':
      return url.toString();
    case 'protocol-relative':
      return `//${url.host}${url.pathname}${url.search}`;
    case 'root-relative':
      return `${url.pathname}${url.search}`;
    case 'query-relative':
      return url.search;
    case 'path-relative':
      return `${reference.path}${url.search}`;
    case 'fragment-relative':
      return '';
  }
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
  if (fixture.exchanges.some((exchange) => new URL(exchange.url).protocol !== 'https:')) {
    throw new Error('Fixture contains a non-HTTPS provider request');
  }
  const redacted = redactFixture(fixture);
  if (canonicalJson(redacted).includes('Bearer ') || canonicalJson(redacted).includes('xox')) {
    throw new Error('Fixture redaction did not remove a credential-like value');
  }
  return {
    status: 'fixture_certified',
    fixtureDigest: `sha256:${createHash('sha256').update(canonicalJson(redacted)).digest('hex')}`,
    requestMethods: methods as ('GET' | 'HEAD')[],
    endpointInventory: [
      ...new Set(fixture.exchanges.map((exchange) => redactEndpointUrl(exchange.url))),
    ].sort(),
    noWriteProof: true,
    scopeReview: {
      status: 'self_attested',
      reviewer: manifest.id,
      reviewedAt: certifiedAt,
    },
    certifiedAt,
  };
}

function redactString(value: string): string {
  try {
    return redactEndpointUrl(value);
  } catch {
    return redactTokenLike(value);
  }
}

function redactTokenLike(value: string): string {
  return value.replace(tokenLike, 'REDACTED');
}

type UrlReference =
  | {
      readonly kind:
        'absolute' | 'protocol-relative' | 'root-relative' | 'query-relative' | 'fragment-relative';
    }
  | { readonly kind: 'path-relative'; readonly path: string };

function classifyUrlReference(value: string): UrlReference | undefined {
  if (absoluteUrl.test(value)) return { kind: 'absolute' };
  if (/\s/.test(value)) return undefined;
  if (value.startsWith('//')) return { kind: 'protocol-relative' };
  if (value.startsWith('/')) return { kind: 'root-relative' };
  if (value.startsWith('?')) return { kind: 'query-relative' };
  if (value.startsWith('#')) return { kind: 'fragment-relative' };

  const separator = value.search(/[?#]/);
  if (separator <= 0) return undefined;
  return { kind: 'path-relative', path: value.slice(0, separator) };
}

export function assertConformantGraphBatch(batch: GraphSyncBatch): void {
  for (const event of batch.events) {
    if (
      event.entity.tenantId !== batch.tenantId ||
      event.entity.connectorId !== batch.connectorId
    ) {
      throw new Error('Connector event does not match its sync batch provenance');
    }
    if (!event.entity.observedAt || !event.entity.externalId || !event.entity.attributes.source) {
      throw new Error('Connector event is missing provenance or observation data');
    }
  }
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
