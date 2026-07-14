import { describe, expect, it } from 'vitest';
import { assertArtifactGovernance, type ArtifactGovernanceMetadata } from '../src/index.js';

const metadata: ArtifactGovernanceMetadata = {
  protocolVersions: ['1.0.0'],
  platform: { minimum: '0.1.0', maximum: '0.2.0' },
  provenance: {
    sourceRevision: 'git:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    buildDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    testedAt: '2026-07-14T20:00:00.000Z',
    testStatus: 'passed',
  },
  lifecycle: { status: 'active' },
};

describe('ecosystem governance', () => {
  it('accepts compatible, reproducible active artifacts', () => {
    expect(() => assertArtifactGovernance(metadata, '1.0.0')).not.toThrow();
  });

  it('rejects incompatible, retired, and malformed artifact metadata', () => {
    expect(() =>
      assertArtifactGovernance({ ...metadata, platform: { minimum: '0.2.0' } }, '1.0.0'),
    ).toThrow('compatible');
    expect(() =>
      assertArtifactGovernance(
        {
          ...metadata,
          lifecycle: {
            status: 'retired',
            deprecation: { message: 'Retired', effectiveAt: '2026-07-14T20:00:00.000Z' },
          },
        },
        '1.0.0',
      ),
    ).toThrow('Retired');
    expect(() =>
      assertArtifactGovernance(
        { ...metadata, provenance: { ...metadata.provenance, buildDigest: 'sha256:invalid' } },
        '1.0.0',
      ),
    ).toThrow('build digest');
  });
});
