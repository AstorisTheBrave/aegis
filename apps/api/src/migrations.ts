import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';

const migrations = [
  '0001_access_graph.sql',
  '0002_review_campaigns.sql',
  '0003_sync_runs.sql',
  '0004_extension_registry.sql',
  '0005_saas_discovery.sql',
  '0006_policy_review_context.sql',
  '0007_workflows.sql',
  '0008_controlled_actions.sql',
] as const;

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS governance_schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
  for (const [migration, table] of [
    ['0001_access_graph.sql', 'governance_identities'],
    ['0002_review_campaigns.sql', 'governance_review_campaigns'],
    ['0003_sync_runs.sql', 'governance_sync_runs'],
    ['0004_extension_registry.sql', 'governance_extensions'],
    ['0005_saas_discovery.sql', 'governance_saas_catalog_applications'],
  ] as const) {
    const existing = await pool.query<{ exists: boolean }>(
      `SELECT to_regclass($1) IS NOT NULL AS exists`,
      [`public.${table}`],
    );
    if (existing.rows[0]?.exists) {
      await pool.query(
        `INSERT INTO governance_schema_migrations (name)
         VALUES ($1)
         ON CONFLICT (name) DO NOTHING`,
        [migration],
      );
    }
  }
  const policyColumn = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'governance_review_tasks'
         AND column_name = 'policy'
    ) AS exists`,
  );
  if (policyColumn.rows[0]?.exists) {
    await pool.query(
      `INSERT INTO governance_schema_migrations (name)
       VALUES ('0006_policy_review_context.sql') ON CONFLICT (name) DO NOTHING`,
    );
  }
  const workflowTable = await pool.query<{ exists: boolean }>(
    `SELECT to_regclass('public.governance_workflow_definitions') IS NOT NULL AS exists`,
  );
  if (workflowTable.rows[0]?.exists) {
    await pool.query(
      `INSERT INTO governance_schema_migrations (name)
       VALUES ('0007_workflows.sql') ON CONFLICT (name) DO NOTHING`,
    );
  }
  const actionsTable = await pool.query<{ exists: boolean }>(
    `SELECT to_regclass('public.governance_controlled_actions') IS NOT NULL AS exists`,
  );
  if (actionsTable.rows[0]?.exists) {
    await pool.query(
      `INSERT INTO governance_schema_migrations (name)
       VALUES ('0008_controlled_actions.sql') ON CONFLICT (name) DO NOTHING`,
    );
  }
  for (const migration of migrations) {
    const applied = await pool.query<{ name: string }>(
      'SELECT name FROM governance_schema_migrations WHERE name = $1',
      [migration],
    );
    if (applied.rows[0]) continue;
    const sql = await readFile(
      new URL(`../../../packages/postgres-store/migrations/${migration}`, import.meta.url),
      'utf8',
    );
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO governance_schema_migrations (name) VALUES ($1)', [
        migration,
      ]);
      await client.query('COMMIT');
    } catch (cause) {
      await client.query('ROLLBACK');
      throw cause;
    } finally {
      client.release();
    }
  }
}
