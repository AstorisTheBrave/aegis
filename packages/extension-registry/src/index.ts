import { createHash, sign, verify, type KeyObject } from 'node:crypto';
import {
  CONNECTOR_PROTOCOL_VERSION,
  parseManifest,
  type ConnectorManifest,
} from '@open-saas-governance/connector-protocol';

export { CONNECTOR_PROTOCOL_VERSION } from '@open-saas-governance/connector-protocol';

export type ExtensionKind = 'connector' | 'policy-pack';
export type CertificationStatus = 'fixture_certified' | 'live_certified';

export interface ConnectorCertification {
  readonly status: CertificationStatus;
  readonly fixtureDigest: string;
  readonly requestMethods: readonly ('GET' | 'HEAD')[];
  readonly endpointInventory: readonly string[];
  readonly noWriteProof: true;
  readonly scopeReview: {
    readonly status: 'self_attested' | 'maintainer_reviewed';
    readonly reviewer: string;
    readonly reviewedAt: string;
  };
  readonly certifiedAt: string;
}

export interface ConnectorContribution {
  readonly manifest: ConnectorManifest;
  readonly certification: ConnectorCertification;
}

export interface PolicyRuleDescriptor {
  readonly id: string;
  readonly title: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly requiredSourceFacts: readonly string[];
}

export interface PolicyPackContribution {
  readonly controls: readonly string[];
  readonly rules: readonly PolicyRuleDescriptor[];
}

export interface ExtensionArtifactPayload {
  readonly id: string;
  readonly version: string;
  readonly kind: ExtensionKind;
  readonly publishedAt: string;
  readonly maintainer: { readonly name: string; readonly contact: string };
  readonly protocolVersion: typeof CONNECTOR_PROTOCOL_VERSION;
  readonly content: ConnectorContribution | PolicyPackContribution;
}

export interface SignedExtensionArtifact {
  readonly payload: ExtensionArtifactPayload;
  readonly digest: string;
  readonly publicKey: string;
  readonly signature: string;
}

export interface ExtensionRegistryRepository {
  install(artifact: SignedExtensionArtifact): Promise<void>;
  list(): Promise<readonly SignedExtensionArtifact[]>;
}

export class InMemoryExtensionRegistryRepository implements ExtensionRegistryRepository {
  readonly #artifacts = new Map<string, SignedExtensionArtifact>();

  async install(artifact: SignedExtensionArtifact): Promise<void> {
    const key = artifactKey(artifact.payload);
    if (this.#artifacts.has(key)) throw new Error(`Extension ${key} is already installed`);
    this.#artifacts.set(key, artifact);
  }

  async list(): Promise<readonly SignedExtensionArtifact[]> {
    return [...this.#artifacts.values()];
  }
}

export class ExtensionRegistry {
  constructor(private readonly repository: ExtensionRegistryRepository) {}

  async install(artifact: SignedExtensionArtifact): Promise<void> {
    verifyArtifact(artifact);
    if (artifact.payload.kind === 'connector') assertReadOnlyConnectorArtifact(artifact);
    await this.repository.install(artifact);
  }

  async list(kind?: ExtensionKind): Promise<readonly SignedExtensionArtifact[]> {
    const extensions = await this.repository.list();
    return extensions
      .filter((artifact) => !kind || artifact.payload.kind === kind)
      .sort((left, right) =>
        [left.payload.kind, left.payload.id, left.payload.version]
          .join(':')
          .localeCompare([right.payload.kind, right.payload.id, right.payload.version].join(':')),
      );
  }
}

export function digestPayload(payload: ExtensionArtifactPayload): string {
  return `sha256:${sha256(canonicalJson(payload))}`;
}

export function verifyArtifact(artifact: SignedExtensionArtifact): void {
  if (artifact.digest !== digestPayload(artifact.payload)) {
    throw new Error('Extension artifact digest does not match its canonical payload');
  }
  const valid = verify(
    null,
    Buffer.from(canonicalJson({ digest: artifact.digest, payload: artifact.payload })),
    artifact.publicKey,
    Buffer.from(artifact.signature, 'base64'),
  );
  if (!valid) throw new Error('Extension artifact signature is invalid');
}

export function signArtifact(
  payload: ExtensionArtifactPayload,
  publicKey: string,
  privateKey: KeyObject | string,
): SignedExtensionArtifact {
  const digest = digestPayload(payload);
  return {
    payload,
    digest,
    publicKey,
    signature: sign(null, Buffer.from(canonicalJson({ digest, payload })), privateKey).toString(
      'base64',
    ),
  };
}

export function assertReadOnlyConnectorArtifact(artifact: SignedExtensionArtifact): void {
  if (artifact.payload.kind !== 'connector') return;
  const connector = artifact.payload.content as ConnectorContribution;
  parseManifest(connector.manifest);
  if (connector.certification.noWriteProof !== true) {
    throw new Error('Connector certification must prove no provider write capability');
  }
  if (!connector.certification.fixtureDigest.startsWith('sha256:')) {
    throw new Error('Connector certification must include a fixture digest');
  }
  if (!connector.certification.scopeReview.reviewer.trim()) {
    throw new Error('Connector certification must identify its scope reviewer');
  }
  if (
    !connector.certification.requestMethods.every((method) => method === 'GET' || method === 'HEAD')
  ) {
    throw new Error('Connector certification contains a non-read-only request method');
  }
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function artifactKey(payload: ExtensionArtifactPayload): string {
  return `${payload.kind}:${payload.id}:${payload.version}`;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
