import { readFile } from 'node:fs/promises';

import { type GraphSyncBatch, type Identity } from '@open-saas-governance/access-graph';
import { verifyAuditChain } from '@open-saas-governance/audit-ledger';
import type { Finding } from '@aegis/findings';
import { ReviewCampaignService } from '@aegis/reviews';
import type { WorkflowDefinition, WorkflowExecution } from '@aegis/workflow-contract';
import type { SignedExtensionArtifact } from '@aegis/extension-registry';
import type { CatalogApplication } from '@aegis/saas-catalog';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PostgresAccessGraphRepository,
  PostgresAuditLedger,
  PostgresExtensionRegistryRepository,
  PostgresReviewCampaignRepository,
  PostgresSaasCatalogRepository,
  PostgresSyncRunStore,
  PostgresDiscoveryRepository,
  PostgresWorkflowRepository,
} from '../src/index.js';

const databaseUrl = process.env.GOVERNANCE_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('PostgreSQL storage adapters', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const graph = new PostgresAccessGraphRepository(pool);
  const ledger = new PostgresAuditLedger(pool);
  const reviews = new ReviewCampaignService(new PostgresReviewCampaignRepository(pool), ledger);
  const migrationUrl = new URL('../migrations/0001_access_graph.sql', import.meta.url);
  const reviewMigrationUrl = new URL('../migrations/0002_review_campaigns.sql', import.meta.url);
  const syncMigrationUrl = new URL('../migrations/0003_sync_runs.sql', import.meta.url);
  const extensionMigrationUrl = new URL(
    '../migrations/0004_extension_registry.sql',
    import.meta.url,
  );
  const discoveryMigrationUrl = new URL('../migrations/0005_saas_discovery.sql', import.meta.url);
  const policyReviewMigrationUrl = new URL(
    '../migrations/0006_policy_review_context.sql',
    import.meta.url,
  );
  const workflowMigrationUrl = new URL('../migrations/0007_workflows.sql', import.meta.url);

  beforeAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS
      governance_workflow_executions,
      governance_workflow_definitions,
      governance_review_task_decisions,
      governance_review_tasks,
      governance_review_campaigns,
      governance_sync_runs,
      governance_extensions,
      governance_discovery_observations,
      governance_saas_catalog_applications,
      governance_grants,
      governance_entitlements,
      governance_resources,
      governance_identities,
      governance_connector_syncs,
      governance_audit_entries CASCADE`);
    await pool.query(await readFile(migrationUrl, 'utf8'));
    await pool.query(await readFile(reviewMigrationUrl, 'utf8'));
    await pool.query(await readFile(syncMigrationUrl, 'utf8'));
    await pool.query(await readFile(extensionMigrationUrl, 'utf8'));
    await pool.query(await readFile(discoveryMigrationUrl, 'utf8'));
    await pool.query(await readFile(policyReviewMigrationUrl, 'utf8'));
    await pool.query(await readFile(workflowMigrationUrl, 'utf8'));
  });

  afterAll(async () => {
    await pool.end();
  });

  it('round-trips a complete graph sync and a tamper-evident audit chain', async () => {
    const batch = graphSyncBatch();
    await graph.applySync(batch);

    await expect(graph.getIdentity('tenant-acme', 'identity-alice')).resolves.toMatchObject({
      displayName: 'Alice Example',
      status: 'ACTIVE',
    });
    await expect(graph.listAccessForIdentity('tenant-acme', 'identity-alice')).resolves.toEqual([
      expect.objectContaining({
        resource: expect.objectContaining({ id: 'resource-platform' }),
        entitlement: expect.objectContaining({ privileged: true }),
        grant: expect.objectContaining({ grantType: 'DIRECT' }),
      }),
    ]);
    await expect(graph.listResources('tenant-acme')).resolves.toEqual([
      expect.objectContaining({ id: 'resource-platform' }),
    ]);
    await expect(graph.listAccess('tenant-acme')).resolves.toHaveLength(1);

    await ledger.append({
      tenantId: 'tenant-acme',
      occurredAt: '2026-07-14T10:00:00.000Z',
      actor: 'connector:github-cloud',
      type: 'sync.completed',
      data: { eventCount: batch.events.length },
    });
    await ledger.append({
      tenantId: 'tenant-acme',
      occurredAt: '2026-07-14T10:01:00.000Z',
      actor: 'system',
      type: 'finding.created',
      data: { severity: 'high' },
    });

    await expect(ledger.list('tenant-acme')).resolves.toSatisfy(verifyAuditChain);

    const campaign = await reviews.create({
      tenantId: 'tenant-acme',
      title: 'July GitHub review',
      findings: [sampleFinding()],
      resources: [{ id: 'resource-platform', businessOwner: 'owner@example.com' }],
      actor: 'admin@example.com',
      createdAt: '2026-07-14T10:02:00.000Z',
    });
    await reviews.decide({
      tenantId: 'tenant-acme',
      taskId: campaign.tasks[0]!.id,
      kind: 'retain',
      reviewer: 'owner@example.com',
      rationale: 'On-call ownership is current.',
      decidedAt: '2026-07-14T10:03:00.000Z',
    });
    await expect(
      new PostgresReviewCampaignRepository(pool).get('tenant-acme', campaign.id),
    ).resolves.toMatchObject({ status: 'complete', tasks: [{ decisions: [{ kind: 'retain' }] }] });

    const policyCampaign = await reviews.create({
      tenantId: 'tenant-acme',
      title: 'Application ownership review',
      findings: [sampleFinding()],
      policyContexts: {
        [sampleFinding().id]: {
          policyId: 'application-owner.v1',
          subjectId: 'resource-platform',
          subjectKind: 'application',
          displayName: 'acme/platform',
          evidence: [{ sourceReference: 'acme/platform', observedAt: '2026-07-14T10:03:30.000Z' }],
        },
      },
      resources: [{ id: 'resource-platform', businessOwner: 'owner@example.com' }],
      actor: 'admin@example.com',
      createdAt: '2026-07-14T10:03:30.000Z',
    });
    await expect(
      new PostgresReviewCampaignRepository(pool).get('tenant-acme', policyCampaign.id),
    ).resolves.toMatchObject({ tasks: [{ policy: { policyId: 'application-owner.v1' } }] });

    const syncRuns = new PostgresSyncRunStore(pool);
    await syncRuns.start({
      id: 'sync:github-cloud:2026-07-14T10:04:00.000Z',
      tenantId: 'tenant-acme',
      connectorId: 'github-cloud',
      startedAt: '2026-07-14T10:04:00.000Z',
    });
    await syncRuns.complete({
      tenantId: 'tenant-acme',
      id: 'sync:github-cloud:2026-07-14T10:04:00.000Z',
      completedAt: '2026-07-14T10:05:00.000Z',
      eventCount: 4,
    });
    await expect(syncRuns.list('tenant-acme')).resolves.toMatchObject([
      { status: 'completed', eventCount: 4 },
    ]);

    const extensions = new PostgresExtensionRegistryRepository(pool);
    await extensions.install(sampleExtension());
    await expect(extensions.list()).resolves.toMatchObject([
      { payload: { id: 'acme-policy-pack', kind: 'policy-pack', version: '1.0.0' } },
    ]);

    const catalog = new PostgresSaasCatalogRepository(pool);
    await catalog.upsert(sampleCatalogApplication());
    await expect(catalog.get('tenant-acme', 'slack')).resolves.toMatchObject({
      normalizedName: 'slack',
      domains: ['slack.com'],
      aliases: ['slack technologies'],
    });
    await expect(
      catalog.assignOwners('tenant-acme', 'slack', [], '2026-07-14T10:07:00.000Z'),
    ).resolves.toMatchObject({
      id: 'slack',
      owners: [],
    });
    const discovery = new PostgresDiscoveryRepository(pool);
    await discovery.record({
      tenantId: 'tenant-acme',
      id: 'idp:slack:1',
      source: 'idp',
      sourceReference: 'application/slack',
      vendorName: 'Slack',
      domain: 'slack.com',
      observedAt: '2026-07-14T10:08:00.000Z',
      activityCount: 1,
      identityType: 'service_account',
    });
    await expect(discovery.list('tenant-acme')).resolves.toMatchObject([
      { id: 'idp:slack:1', source: 'idp', identityType: 'service_account' },
    ]);

    const workflows = new PostgresWorkflowRepository(pool);
    await workflows.upsertDefinition('tenant-acme', sampleWorkflowDefinition());
    await workflows.recordExecution(sampleWorkflowExecution());
    await expect(workflows.listExecutions('tenant-acme')).resolves.toMatchObject([
      { definitionId: 'leaver.v1', providerMutation: false },
    ]);
  });
});

function sampleFinding(): Finding {
  return {
    id: 'github.direct-grant-drift.v1:identity-alice:resource-platform:grant-alice-maintain',
    type: 'DIRECT_GRANT_DRIFT',
    severity: 'low',
    ruleId: 'github.direct-grant-drift.v1',
    title: 'Direct repository grant bypasses team access',
    evidence: { identityId: 'identity-alice', resourceId: 'resource-platform' },
    sourceFacts: [],
    subject: {
      identityId: 'identity-alice',
      resourceId: 'resource-platform',
      grantId: 'grant-alice-maintain',
    },
  };
}

function sampleWorkflowDefinition(): WorkflowDefinition {
  return {
    schemaVersion: 'workflow.v1',
    id: 'leaver.v1',
    version: '1.0.0',
    title: 'Leaver',
    trigger: 'hris',
    steps: [{ id: 'approval', kind: 'approval', title: 'Owner approval', approverRole: 'owner' }],
  };
}

function sampleWorkflowExecution(): WorkflowExecution {
  return {
    id: 'dry-run:tenant-acme:leaver.v1:1',
    tenantId: 'tenant-acme',
    definitionId: 'leaver.v1',
    definitionVersion: '1.0.0',
    createdAt: '2026-07-14T10:09:00.000Z',
    actor: 'admin@example.com',
    status: 'requires_approval',
    sourceFacts: [],
    preview: [
      {
        stepId: 'approval',
        kind: 'approval',
        title: 'Owner approval',
        status: 'pending_approval',
        requiredScopes: [],
        providerMutation: false,
      },
    ],
    providerMutation: false,
  };
}

function sampleCatalogApplication(): CatalogApplication {
  return {
    tenantId: 'tenant-acme',
    id: 'slack',
    vendorName: 'Slack',
    normalizedName: 'Slack',
    domains: ['https://www.slack.com'],
    aliases: ['Slack Technologies'],
    category: 'collaboration',
    riskTier: 'high',
    dataClassification: 'confidential',
    recommendation: 'monitor',
    owners: [
      { identityId: 'identity-alice', role: 'technical', assignedAt: '2026-07-14T10:06:00.000Z' },
    ],
    approvedAlternatives: [],
    createdAt: '2026-07-14T10:06:00.000Z',
    updatedAt: '2026-07-14T10:06:00.000Z',
  };
}

function sampleExtension(): SignedExtensionArtifact {
  return {
    payload: {
      id: 'acme-policy-pack',
      version: '1.0.0',
      kind: 'policy-pack',
      publishedAt: '2026-07-14T10:06:00.000Z',
      maintainer: { name: 'Aegis Community', contact: 'security@example.test' },
      protocolVersion: '1.0.0',
      content: {
        controls: ['SOC 2 CC6.2'],
        rules: [
          {
            id: 'acme.policy.v1',
            title: 'Acme policy',
            severity: 'medium',
            requiredSourceFacts: ['identity'],
          },
        ],
      },
    },
    digest: 'sha256:fixture',
    publicKey: 'fixture-key',
    signature: 'fixture-signature',
  };
}

function graphSyncBatch(): GraphSyncBatch {
  const identity: Identity = {
    kind: 'identity',
    tenantId: 'tenant-acme',
    id: 'identity-alice',
    connectorId: 'github-cloud',
    externalId: '123',
    displayName: 'Alice Example',
    email: 'alice@example.com',
    status: 'ACTIVE',
    observedAt: '2026-07-14T10:00:00.000Z',
    attributes: { login: 'alice' },
  };

  return {
    tenantId: 'tenant-acme',
    connectorId: 'github-cloud',
    startedAt: '2026-07-14T10:00:00.000Z',
    completedAt: '2026-07-14T10:01:00.000Z',
    events: [
      { type: 'identity.upsert', entity: identity },
      {
        type: 'resource.upsert',
        entity: {
          kind: 'resource',
          tenantId: 'tenant-acme',
          id: 'resource-platform',
          connectorId: 'github-cloud',
          externalId: 'acme/platform',
          displayName: 'acme/platform',
          resourceType: 'repository',
          observedAt: '2026-07-14T10:00:00.000Z',
          attributes: {},
        },
      },
      {
        type: 'entitlement.upsert',
        entity: {
          kind: 'entitlement',
          tenantId: 'tenant-acme',
          id: 'entitlement-maintain',
          connectorId: 'github-cloud',
          externalId: 'acme/platform:maintain',
          displayName: 'Maintain',
          resourceId: 'resource-platform',
          entitlementType: 'repository-role',
          privileged: true,
          observedAt: '2026-07-14T10:00:00.000Z',
          attributes: {},
        },
      },
      {
        type: 'grant.upsert',
        entity: {
          kind: 'grant',
          tenantId: 'tenant-acme',
          id: 'grant-alice-maintain',
          connectorId: 'github-cloud',
          externalId: '123:acme/platform:maintain',
          identityId: 'identity-alice',
          entitlementId: 'entitlement-maintain',
          grantType: 'DIRECT',
          observedAt: '2026-07-14T10:00:00.000Z',
          attributes: {},
        },
      },
    ],
  };
}
