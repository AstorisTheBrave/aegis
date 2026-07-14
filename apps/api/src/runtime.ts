import { Buffer } from 'node:buffer';
import { Pool } from 'pg';
import {
  PostgresAccessGraphRepository,
  PostgresAuditLedger,
  PostgresReviewCampaignRepository,
  PostgresSyncRunStore,
} from '@open-saas-governance/postgres-store';
import { GraphReviewCampaignManager } from './review-campaigns.js';
import { StoredCampaignEvidenceReader } from './evidence.js';
import { createApp } from './app.js';
import { runMigrations } from './migrations.js';

export interface RuntimeConfig {
  readonly databaseUrl: string;
  readonly masterKey: Uint8Array;
}

export interface RunningAegisApi {
  readonly app: ReturnType<typeof createApp>;
  close(): Promise<void>;
}

export function parseRuntimeConfig(environment: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const encoded = environment.MASTER_KEY;
  if (!encoded) throw new Error('MASTER_KEY is required');
  const masterKey = Buffer.from(encoded, 'base64');
  if (masterKey.byteLength !== 32) throw new Error('MASTER_KEY must decode to exactly 32 bytes');
  return { databaseUrl, masterKey };
}

export async function createRuntime(
  environment: NodeJS.ProcessEnv = process.env,
): Promise<RunningAegisApi> {
  const config = parseRuntimeConfig(environment);
  const pool = new Pool({ connectionString: config.databaseUrl });
  try {
    await pool.query('SELECT 1');
    await runMigrations(pool);
    const graph = new PostgresAccessGraphRepository(pool);
    const audit = new PostgresAuditLedger(pool);
    const reviewRepository = new PostgresReviewCampaignRepository(pool);
    const campaigns = new GraphReviewCampaignManager(graph, reviewRepository, audit);
    const app = createApp(graph, {
      campaigns,
      campaignEvidence: new StoredCampaignEvidenceReader(reviewRepository, audit),
      syncRuns: new PostgresSyncRunStore(pool),
    });
    return {
      app,
      async close() {
        await app.close();
        await pool.end();
      },
    };
  } catch (cause) {
    await pool.end();
    throw cause;
  }
}
