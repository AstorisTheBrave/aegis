export const platformVersion = '0.1.0' as const;

export interface PlatformCompatibility {
  readonly minimum: string;
  readonly maximum?: string;
}

export interface ArtifactGovernanceMetadata {
  readonly protocolVersions: readonly string[];
  readonly platform: PlatformCompatibility;
  readonly provenance: {
    readonly sourceRevision: string;
    readonly buildDigest: string;
    readonly testedAt: string;
    readonly testStatus: 'passed';
  };
  readonly lifecycle:
    | { readonly status: 'active' }
    | {
        readonly status: 'deprecated';
        readonly deprecation: {
          readonly message: string;
          readonly effectiveAt: string;
          readonly replacementId?: string;
        };
      }
    | {
        readonly status: 'retired';
        readonly deprecation: {
          readonly message: string;
          readonly effectiveAt: string;
          readonly replacementId?: string;
        };
      };
}

export function assertArtifactGovernance(
  metadata: ArtifactGovernanceMetadata,
  requiredProtocolVersion: string,
  currentPlatformVersion = platformVersion,
): void {
  const minimum = parseSemver(metadata.platform.minimum);
  const current = parseSemver(currentPlatformVersion);
  const maximum = metadata.platform.maximum ? parseSemver(metadata.platform.maximum) : undefined;
  if (
    !metadata.protocolVersions.length ||
    !metadata.protocolVersions.includes(requiredProtocolVersion)
  ) {
    throw new Error(`Artifact does not support connector protocol ${requiredProtocolVersion}`);
  }
  metadata.protocolVersions.forEach(parseSemver);
  if (compareSemver(minimum, current) > 0 || (maximum && compareSemver(current, maximum) > 0)) {
    throw new Error(`Artifact is not compatible with Aegis ${currentPlatformVersion}`);
  }
  if (maximum && compareSemver(minimum, maximum) > 0) {
    throw new Error('Artifact compatibility range is invalid');
  }
  if (!/^git:[a-f0-9]{40,64}$/.test(metadata.provenance.sourceRevision)) {
    throw new Error('Artifact provenance must include an immutable git revision');
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(metadata.provenance.buildDigest)) {
    throw new Error('Artifact provenance must include a sha256 build digest');
  }
  if (Number.isNaN(new Date(metadata.provenance.testedAt).valueOf())) {
    throw new Error('Artifact provenance must include a valid test timestamp');
  }
  if (metadata.lifecycle.status === 'retired') {
    throw new Error('Retired artifacts cannot be installed');
  }
  if (metadata.lifecycle.status === 'deprecated') assertDeprecation(metadata.lifecycle.deprecation);
}

function assertDeprecation(value: {
  message: string;
  effectiveAt: string;
  replacementId?: string;
}) {
  if (!value.message.trim() || Number.isNaN(new Date(value.effectiveAt).valueOf())) {
    throw new Error('Deprecated artifacts require a message and effective timestamp');
  }
  if (value.replacementId !== undefined && !value.replacementId.trim()) {
    throw new Error('Artifact replacement ID cannot be blank');
  }
}

type Semver = readonly [number, number, number];

function parseSemver(value: string): Semver {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) throw new Error(`Invalid semantic version: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(left: Semver, right: Semver): number {
  for (let index = 0; index < left.length; index += 1) {
    const comparison = left[index]! - right[index]!;
    if (comparison !== 0) return comparison;
  }
  return 0;
}
