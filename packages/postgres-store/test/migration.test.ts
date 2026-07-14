import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const migration = await readFile(
  new URL('../migrations/0001_access_graph.sql', import.meta.url),
  'utf8',
);
const extensionMigration = await readFile(
  new URL('../migrations/0004_extension_registry.sql', import.meta.url),
  'utf8',
);
const discoveryMigration = await readFile(
  new URL('../migrations/0005_saas_discovery.sql', import.meta.url),
  'utf8',
);
const policyReviewMigration = await readFile(
  new URL('../migrations/0006_policy_review_context.sql', import.meta.url),
  'utf8',
);

describe('0001 access graph migration', () => {
  it('keeps every graph table tenant-scoped and referentially sound', () => {
    for (const table of [
      'governance_identities',
      'governance_resources',
      'governance_entitlements',
      'governance_grants',
      'governance_audit_entries',
    ]) {
      expect(migration).toContain(`CREATE TABLE ${table}`);
    }

    expect(migration).toContain('PRIMARY KEY (tenant_id, id)');
    expect(migration).toContain('PRIMARY KEY (tenant_id, sequence)');
    expect(migration).toContain('DEFERRABLE INITIALLY DEFERRED');
  });
});

describe('0004 extension registry migration', () => {
  it('keeps installed artifacts versioned by extension kind and ID', () => {
    expect(extensionMigration).toContain('CREATE TABLE IF NOT EXISTS governance_extensions');
    expect(extensionMigration).toContain("CHECK (kind IN ('connector', 'policy-pack'))");
    expect(extensionMigration).toContain('PRIMARY KEY (kind, id, version)');
  });
});

describe('0005 SaaS discovery migration', () => {
  it('keeps catalog and observations tenant-scoped with source and activity safety checks', () => {
    expect(discoveryMigration).toContain(
      'CREATE TABLE IF NOT EXISTS governance_saas_catalog_applications',
    );
    expect(discoveryMigration).toContain(
      'CREATE TABLE IF NOT EXISTS governance_discovery_observations',
    );
    expect(discoveryMigration).toContain("CHECK (source IN ('idp', 'finance'");
    expect(discoveryMigration).toContain('CHECK (activity_count >= 0)');
  });
});

describe('0006 policy review context migration', () => {
  it('adds a nullable, indexable policy payload without changing access review tasks', () => {
    expect(policyReviewMigration).toContain('ADD COLUMN policy JSONB');
    expect(policyReviewMigration).toContain('governance_review_tasks_policy_idx');
  });
});
