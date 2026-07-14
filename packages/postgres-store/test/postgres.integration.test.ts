import { readFile } from 'node:fs/promises';

import { type GraphSyncBatch, type Identity } from '@open-saas-governance/access-graph';
import { verifyAuditChain } from '@open-saas-governance/audit-ledger';
import type { Finding } from '@aegis/findings';
import { ReviewCampaignService } from '@aegis/reviews';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PostgresAccessGraphRepository,
  PostgresAuditLedger,
  PostgresReviewCampaignRepository,
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

  beforeAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS
      governance_review_task_decisions,
      governance_review_tasks,
      governance_review_campaigns,
      governance_grants,
      governance_entitlements,
      governance_resources,
      governance_identities,
      governance_connector_syncs,
      governance_audit_entries CASCADE`);
    await pool.query(await readFile(migrationUrl, 'utf8'));
    await pool.query(await readFile(reviewMigrationUrl, 'utf8'));
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
