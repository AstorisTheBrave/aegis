import type {
  ExtensionRegistryRepository,
  SignedExtensionArtifact,
} from '@aegis/extension-registry';
import type { Pool } from 'pg';

type ExtensionRow = {
  kind: SignedExtensionArtifact['payload']['kind'];
  id: string;
  version: string;
  payload: SignedExtensionArtifact['payload'];
  digest: string;
  public_key: string;
  signature: string;
};

export class PostgresExtensionRegistryRepository implements ExtensionRegistryRepository {
  constructor(private readonly pool: Pool) {}

  async install(artifact: SignedExtensionArtifact): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO governance_extensions (kind, id, version, payload, digest, public_key, signature)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          artifact.payload.kind,
          artifact.payload.id,
          artifact.payload.version,
          artifact.payload,
          artifact.digest,
          artifact.publicKey,
          artifact.signature,
        ],
      );
    } catch (cause) {
      if (isUniqueViolation(cause)) {
        throw new Error(
          `Extension ${artifact.payload.kind}:${artifact.payload.id}:${artifact.payload.version} is already installed`,
        );
      }
      throw cause;
    }
  }

  async list(): Promise<readonly SignedExtensionArtifact[]> {
    const result = await this.pool.query<ExtensionRow>(
      `SELECT kind, id, version, payload, digest, public_key, signature
         FROM governance_extensions
        ORDER BY kind, id, version`,
    );
    return result.rows.map((row) => ({
      payload: row.payload,
      digest: row.digest,
      publicKey: row.public_key,
      signature: row.signature,
    }));
  }
}

function isUniqueViolation(cause: unknown): cause is { code: string } {
  return Boolean(
    cause && typeof cause === 'object' && (cause as { code?: string }).code === '23505',
  );
}
