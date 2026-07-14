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
const workflowMigration = await readFile(
  new URL('../migrations/0007_workflows.sql', import.meta.url),
  'utf8',
);
const controlledActionsMigration = await readFile(
  new URL('../migrations/0008_controlled_actions.sql', import.meta.url),
  'utf8',
);
const providerCertificationMigration = await readFile(
  new URL('../migrations/0009_provider_certification.sql', import.meta.url),
  'utf8',
);
const accessRequestsMigration = await readFile(
  new URL('../migrations/0010_access_requests.sql', import.meta.url),
  'utf8',
);
const assistanceMigration = await readFile(
  new URL('../migrations/0011_assistance.sql', import.meta.url),
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

describe('0007 workflow migration', () => {
  it('keeps definitions and dry-run executions tenant-scoped', () => {
    expect(workflowMigration).toContain('CREATE TABLE governance_workflow_definitions');
    expect(workflowMigration).toContain('CREATE TABLE governance_workflow_executions');
    expect(workflowMigration).toContain('PRIMARY KEY (tenant_id, id)');
  });
});

describe('0008 controlled actions migration', () => {
  it('keeps action requests, approvals, and executions tenant-scoped and idempotent', () => {
    expect(controlledActionsMigration).toContain('CREATE TABLE governance_controlled_actions');
    expect(controlledActionsMigration).toContain('CREATE TABLE governance_action_approvals');
    expect(controlledActionsMigration).toContain('CREATE TABLE governance_action_executions');
    expect(controlledActionsMigration).toContain('UNIQUE (tenant_id, idempotency_key)');
  });
});

describe('0009 provider certification migration', () => {
  it('keeps test activations and their certifications tenant-scoped', () => {
    expect(providerCertificationMigration).toContain(
      'CREATE TABLE governance_test_tenant_activations',
    );
    expect(providerCertificationMigration).toContain(
      'CREATE TABLE governance_provider_certifications',
    );
    expect(providerCertificationMigration).toContain('PRIMARY KEY (tenant_id, id)');
    expect(providerCertificationMigration).toContain(
      'REFERENCES governance_test_tenant_activations',
    );
    expect(providerCertificationMigration).toContain('CHECK (expires_at > activated_at)');
  });
});

describe('0010 access requests migration', () => {
  it('keeps requests tenant-scoped and idempotent', () => {
    expect(accessRequestsMigration).toContain('CREATE TABLE governance_access_requests');
    expect(accessRequestsMigration).toContain('PRIMARY KEY (tenant_id, id)');
    expect(accessRequestsMigration).toContain('UNIQUE (tenant_id, idempotency_key)');
    expect(accessRequestsMigration).toContain('governance_access_requests_tenant_requested_idx');
  });
});

describe('0011 assistance migration', () => {
  it('keeps assistance settings tenant-scoped', () => {
    expect(assistanceMigration).toContain('CREATE TABLE governance_assistance_settings');
    expect(assistanceMigration).toContain('tenant_id TEXT PRIMARY KEY');
  });
});
