import {
  ExtensionRegistry,
  type ConnectorContribution,
  type ExtensionKind,
  type SignedExtensionArtifact,
} from '@aegis/extension-registry';

export interface ExtensionCatalogItem {
  readonly id: string;
  readonly version: string;
  readonly kind: ExtensionKind;
  readonly publishedAt: string;
  readonly maintainer: { readonly name: string; readonly contact: string };
  readonly certificationStatus?: 'fixture_certified' | 'live_certified';
  readonly scopeReviewStatus?: 'self_attested' | 'maintainer_reviewed';
  readonly permissions: readonly string[];
  readonly governanceStatus: 'verified' | 'legacy_unverified';
  readonly lifecycle?: SignedExtensionArtifact['payload']['governance']['lifecycle'];
  readonly compatibility?: {
    readonly protocolVersions: readonly string[];
    readonly platform: SignedExtensionArtifact['payload']['governance']['platform'];
  };
  readonly provenance?: SignedExtensionArtifact['payload']['governance']['provenance'];
}

export interface ExtensionRegistryManager {
  list(kind?: ExtensionKind): Promise<readonly ExtensionCatalogItem[]>;
  install(input: unknown): Promise<ExtensionCatalogItem>;
}

export class VerifiedExtensionRegistryManager implements ExtensionRegistryManager {
  constructor(private readonly registry: ExtensionRegistry) {}

  async list(kind?: ExtensionKind): Promise<readonly ExtensionCatalogItem[]> {
    return (await this.registry.list(kind)).map(toCatalogItem);
  }

  async install(input: unknown): Promise<ExtensionCatalogItem> {
    if (!isSignedExtensionArtifact(input)) throw new Error('Invalid signed extension artifact');
    await this.registry.install(input);
    return toCatalogItem(input);
  }
}

function toCatalogItem(artifact: SignedExtensionArtifact): ExtensionCatalogItem {
  const certification =
    artifact.payload.kind === 'connector'
      ? (artifact.payload.content as ConnectorContribution).certification.status
      : undefined;
  const scopeReview =
    artifact.payload.kind === 'connector'
      ? (artifact.payload.content as ConnectorContribution).certification.scopeReview.status
      : undefined;
  const governance = hasUsableGovernance(artifact.payload.governance)
    ? artifact.payload.governance
    : undefined;
  return {
    id: artifact.payload.id,
    version: artifact.payload.version,
    kind: artifact.payload.kind,
    publishedAt: artifact.payload.publishedAt,
    maintainer: artifact.payload.maintainer,
    permissions:
      artifact.payload.kind === 'connector'
        ? (artifact.payload.content as ConnectorContribution).manifest.minimumScopes
        : [],
    governanceStatus: governance ? 'verified' : 'legacy_unverified',
    ...(governance
      ? {
          lifecycle: governance.lifecycle,
          compatibility: {
            protocolVersions: governance.protocolVersions,
            platform: governance.platform,
          },
          provenance: governance.provenance,
        }
      : {}),
    ...(certification ? { certificationStatus: certification } : {}),
    ...(scopeReview ? { scopeReviewStatus: scopeReview } : {}),
  };
}

function hasUsableGovernance(
  value: unknown,
): value is SignedExtensionArtifact['payload']['governance'] {
  if (!value || typeof value !== 'object') return false;
  const governance = value as Record<string, unknown>;
  return (
    Array.isArray(governance.protocolVersions) &&
    Boolean(governance.platform && typeof governance.platform === 'object') &&
    Boolean(governance.provenance && typeof governance.provenance === 'object') &&
    Boolean(governance.lifecycle && typeof governance.lifecycle === 'object')
  );
}

function isSignedExtensionArtifact(value: unknown): value is SignedExtensionArtifact {
  if (!value || typeof value !== 'object') return false;
  const artifact = value as Record<string, unknown>;
  const payload = artifact.payload as Record<string, unknown> | undefined;
  return Boolean(
    payload &&
    typeof artifact.digest === 'string' &&
    typeof artifact.publicKey === 'string' &&
    typeof artifact.signature === 'string' &&
    typeof payload.id === 'string' &&
    typeof payload.version === 'string' &&
    (payload.kind === 'connector' || payload.kind === 'policy-pack'),
  );
}
