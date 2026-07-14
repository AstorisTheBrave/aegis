import Fastify from 'fastify';
import type {
  AssignCatalogOwnersInput,
  CreateCatalogApplicationInput,
  CreateReviewCampaignInput,
  EvidenceBundle,
  IdentitySummary,
  RecordDiscoveryObservationInput,
  RecordCampaignDecisionInput,
  RecordedReviewDecision,
  ReviewDecisionInput,
} from '@aegis/api-contract';
import type {
  AccessGraphRepository,
  Identity,
  JsonValue,
} from '@open-saas-governance/access-graph';
import type { SyncRunStore } from '@aegis/ingestion';
import { GraphFindingReader, type FindingReader } from './findings.js';
import type { CampaignEvidenceReader } from './evidence.js';
import type { ReviewCampaignManager } from './review-campaigns.js';
import type { ExtensionRegistryManager } from './extensions.js';
import type { DiscoveryManager } from './discovery.js';

export type { FindingReader } from './findings.js';
export type { CampaignEvidenceReader } from './evidence.js';
export type { ReviewCampaignManager } from './review-campaigns.js';
export type { ExtensionRegistryManager } from './extensions.js';
export type { DiscoveryManager } from './discovery.js';

export interface ReviewDecisionRecorder {
  record(
    tenantId: string,
    itemId: string,
    input: ReviewDecisionInput,
  ): Promise<RecordedReviewDecision | undefined>;
}

export interface EvidenceExporter {
  export(tenantId: string): Promise<EvidenceBundle>;
}

export interface ApiServices {
  readonly findings?: FindingReader;
  readonly campaigns?: ReviewCampaignManager;
  readonly syncRuns?: SyncRunStore;
  readonly campaignEvidence?: CampaignEvidenceReader;
  readonly reviews?: ReviewDecisionRecorder;
  readonly evidence?: EvidenceExporter;
  readonly extensions?: ExtensionRegistryManager;
  readonly discovery?: DiscoveryManager;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isOwner(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const owner = value as Record<string, unknown>;
  return (
    typeof owner.identityId === 'string' &&
    (owner.role === 'business' || owner.role === 'technical') &&
    typeof owner.assignedAt === 'string'
  );
}

function isCreateCatalogApplicationInput(value: unknown): value is CreateCatalogApplicationInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.id === 'string' &&
    typeof input.vendorName === 'string' &&
    isStringArray(input.domains) &&
    isStringArray(input.aliases) &&
    typeof input.category === 'string' &&
    ['low', 'medium', 'high', 'critical'].includes(String(input.riskTier)) &&
    ['public', 'internal', 'confidential', 'restricted'].includes(
      String(input.dataClassification),
    ) &&
    ['allow', 'monitor', 'block_recommended'].includes(String(input.recommendation)) &&
    (!('owners' in input) || (Array.isArray(input.owners) && input.owners.every(isOwner))) &&
    (!('approvedAlternatives' in input) || isStringArray(input.approvedAlternatives))
  );
}

function isAssignCatalogOwnersInput(value: unknown): value is AssignCatalogOwnersInput {
  const owners =
    value && typeof value === 'object' ? (value as Record<string, unknown>).owners : undefined;
  return Array.isArray(owners) && owners.every(isOwner);
}

function isRecordDiscoveryObservationInput(
  value: unknown,
): value is RecordDiscoveryObservationInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.id === 'string' &&
    [
      'idp',
      'finance',
      'sso_log',
      'browser_extension',
      'endpoint_inventory',
      'email_domain',
      'api_token_inventory',
    ].includes(String(input.source)) &&
    typeof input.sourceReference === 'string' &&
    typeof input.vendorName === 'string' &&
    typeof input.observedAt === 'string' &&
    typeof input.activityCount === 'number' &&
    (!('domain' in input) || typeof input.domain === 'string') &&
    (!('identityType' in input) ||
      ['human', 'service_account', 'bot', 'oauth_application', 'api_key', 'integration'].includes(
        String(input.identityType),
      )) &&
    (!('metadata' in input) ||
      (!!input.metadata &&
        typeof input.metadata === 'object' &&
        Object.values(input.metadata).every((item) =>
          ['string', 'number', 'boolean'].includes(typeof item),
        )))
  );
}

function isCreateCampaignInput(value: unknown): value is CreateReviewCampaignInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.title === 'string' &&
    typeof input.actor === 'string' &&
    (!('findingIds' in input) ||
      (Array.isArray(input.findingIds) &&
        input.findingIds.every((id) => typeof id === 'string'))) &&
    (!('fallbackReviewer' in input) || typeof input.fallbackReviewer === 'string') &&
    (!('dueAt' in input) || typeof input.dueAt === 'string')
  );
}

function isCampaignDecisionInput(value: unknown): value is RecordCampaignDecisionInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.reviewer === 'string' &&
    typeof input.rationale === 'string' &&
    (input.kind === 'retain' ||
      input.kind === 'remove_recommended' ||
      input.kind === 'delegate' ||
      input.kind === 'exception') &&
    (!('delegatedTo' in input) || typeof input.delegatedTo === 'string') &&
    (!('exceptionExpiresAt' in input) || typeof input.exceptionExpiresAt === 'string')
  );
}

function stringAttribute(
  attributes: Identity['attributes'],
  name: string,
  fallback: string,
): string {
  const value: JsonValue | undefined = attributes[name];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

async function toIdentitySummary(
  graph: AccessGraphRepository,
  identity: Identity,
): Promise<IdentitySummary> {
  const access = await graph.listAccessForIdentity(identity.tenantId, identity.id);
  const privileged = access.some((item) => item.entitlement.privileged);
  return {
    id: identity.id,
    displayName: identity.displayName,
    email: identity.email ?? '',
    source: stringAttribute(identity.attributes, 'source', identity.connectorId),
    sourceAccount: stringAttribute(identity.attributes, 'sourceAccount', identity.connectorId),
    platform: stringAttribute(identity.attributes, 'platform', 'Unknown platform'),
    platformType: stringAttribute(identity.attributes, 'platformType', 'Unknown'),
    status:
      identity.status === 'SUSPENDED' || identity.status === 'DELETED'
        ? 'suspended'
        : privileged
          ? 'requires_review'
          : 'active',
    privileged,
    lastSeen: identity.observedAt,
  };
}

function isReviewDecisionInput(value: unknown): value is ReviewDecisionInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.comment === 'string' &&
    (input.decision === 'approved' ||
      input.decision === 'needs_information' ||
      input.decision === 'revocation_requested')
  );
}

export function createApp(graph: AccessGraphRepository, services: ApiServices = {}) {
  const app = Fastify({ logger: true });
  const findings = services.findings ?? new GraphFindingReader(graph);
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/apps',
    async (request, reply) => {
      if (!services.discovery) return reply.code(501).send({ error: 'discovery_not_configured' });
      return services.discovery.listCatalog(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/apps',
    async (request, reply) => {
      if (!isCreateCatalogApplicationInput(request.body)) {
        return reply.code(400).send({ error: 'invalid_catalog_application' });
      }
      if (!services.discovery) return reply.code(501).send({ error: 'discovery_not_configured' });
      const timestamp = new Date().toISOString();
      try {
        return await services.discovery.createCatalog({
          tenantId: request.params.tenantId,
          id: request.body.id,
          vendorName: request.body.vendorName,
          normalizedName: request.body.normalizedName ?? request.body.vendorName,
          domains: request.body.domains,
          aliases: request.body.aliases,
          category: request.body.category,
          riskTier: request.body.riskTier,
          dataClassification: request.body.dataClassification,
          recommendation: request.body.recommendation,
          owners: request.body.owners ?? [],
          approvedAlternatives: request.body.approvedAlternatives ?? [],
          renewalAt: request.body.renewalAt,
          createdAt: request.body.createdAt ?? timestamp,
          updatedAt: request.body.updatedAt ?? timestamp,
        });
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'catalog_application_failed',
        });
      }
    },
  );
  app.post<{
    Params: { tenantId: string; applicationId: string };
    Body: unknown;
  }>('/v1/tenants/:tenantId/apps/:applicationId/owners', async (request, reply) => {
    if (!isAssignCatalogOwnersInput(request.body)) {
      return reply.code(400).send({ error: 'invalid_catalog_owners' });
    }
    if (!services.discovery) return reply.code(501).send({ error: 'discovery_not_configured' });
    const application = await services.discovery.assignOwners(
      request.params.tenantId,
      request.params.applicationId,
      request.body.owners,
      request.body.updatedAt ?? new Date().toISOString(),
    );
    return application ?? reply.code(404).send({ error: 'catalog_application_not_found' });
  });
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/discovery-queue',
    async (request, reply) => {
      if (!services.discovery) return reply.code(501).send({ error: 'discovery_not_configured' });
      return services.discovery.listQueue(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/discovery-observations',
    async (request, reply) => {
      if (!isRecordDiscoveryObservationInput(request.body)) {
        return reply.code(400).send({ error: 'invalid_discovery_observation' });
      }
      if (!services.discovery) return reply.code(501).send({ error: 'discovery_not_configured' });
      try {
        return await services.discovery.observe({
          tenantId: request.params.tenantId,
          id: request.body.id,
          source: request.body.source,
          sourceReference: request.body.sourceReference,
          vendorName: request.body.vendorName,
          domain: request.body.domain,
          observedAt: request.body.observedAt,
          activityCount: request.body.activityCount,
          identityType: request.body.identityType,
          metadata: request.body.metadata,
        });
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'discovery_observation_failed',
        });
      }
    },
  );
  app.get<{ Querystring: { kind?: 'connector' | 'policy-pack' } }>(
    '/v1/extensions',
    async (request, reply) => {
      if (!services.extensions) return reply.code(501).send({ error: 'extensions_not_configured' });
      if (
        request.query.kind &&
        request.query.kind !== 'connector' &&
        request.query.kind !== 'policy-pack'
      ) {
        return reply.code(400).send({ error: 'invalid_extension_kind' });
      }
      return services.extensions.list(request.query.kind);
    },
  );
  app.post<{ Body: unknown }>('/v1/extensions', async (request, reply) => {
    if (!services.extensions) return reply.code(501).send({ error: 'extensions_not_configured' });
    try {
      return await services.extensions.install(request.body);
    } catch (cause) {
      return reply.code(400).send({
        error: cause instanceof Error ? cause.message : 'extension_installation_failed',
      });
    }
  });
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/sync-runs',
    async (request, reply) => {
      if (!services.syncRuns) return reply.code(501).send({ error: 'sync_runs_not_configured' });
      return services.syncRuns.list(request.params.tenantId);
    },
  );
  app.get<{ Params: { tenantId: string }; Querystring: { query?: string } }>(
    '/v1/tenants/:tenantId/identities',
    async (request) => {
      const query = request.query.query?.trim().toLowerCase() ?? '';
      const identities = await Promise.all(
        (await graph.listIdentities(request.params.tenantId)).map((identity) =>
          toIdentitySummary(graph, identity),
        ),
      );
      return identities.filter(
        (identity) =>
          !query ||
          [identity.displayName, identity.email, identity.source, identity.platform].some((value) =>
            value.toLowerCase().includes(query),
          ),
      );
    },
  );
  app.get<{ Params: { tenantId: string; identityId: string } }>(
    '/v1/tenants/:tenantId/identities/:identityId',
    async (request, reply) => {
      const identity = await graph.getIdentity(request.params.tenantId, request.params.identityId);
      return identity ?? reply.code(404).send({ error: 'identity_not_found' });
    },
  );
  app.get<{ Params: { tenantId: string; identityId: string } }>(
    '/v1/tenants/:tenantId/identities/:identityId/access',
    async (request) =>
      graph.listAccessForIdentity(request.params.tenantId, request.params.identityId),
  );
  app.get<{ Params: { tenantId: string; findingId: string } }>(
    '/v1/tenants/:tenantId/findings/:findingId',
    async (request, reply) => {
      const finding = await findings.get(request.params.tenantId, request.params.findingId);
      return finding ?? reply.code(404).send({ error: 'finding_not_found' });
    },
  );
  app.get<{ Params: { tenantId: string } }>('/v1/tenants/:tenantId/findings', async (request) =>
    findings.list(request.params.tenantId),
  );
  app.post<{
    Params: { tenantId: string; itemId: string };
    Body: unknown;
  }>('/v1/tenants/:tenantId/reviews/:itemId/decisions', async (request, reply) => {
    if (!isReviewDecisionInput(request.body)) {
      return reply.code(400).send({ error: 'invalid_review_decision' });
    }
    if (!services.reviews) return reply.code(501).send({ error: 'reviews_not_configured' });
    const recorded = await services.reviews.record(
      request.params.tenantId,
      request.params.itemId,
      request.body,
    );
    return recorded ?? reply.code(404).send({ error: 'review_not_found' });
  });
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/evidence/export',
    async (request, reply) => {
      if (!services.evidence) return reply.code(501).send({ error: 'evidence_not_configured' });
      return services.evidence.export(request.params.tenantId);
    },
  );
  app.get<{ Params: { tenantId: string; campaignId: string } }>(
    '/v1/tenants/:tenantId/review-campaigns/:campaignId/evidence/export',
    async (request, reply) => {
      if (!services.campaignEvidence) {
        return reply.code(501).send({ error: 'campaign_evidence_not_configured' });
      }
      const bundle = await services.campaignEvidence.export(
        request.params.tenantId,
        request.params.campaignId,
      );
      return bundle ?? reply.code(404).send({ error: 'review_campaign_not_found' });
    },
  );
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/review-campaigns',
    async (request, reply) => {
      if (!services.campaigns)
        return reply.code(501).send({ error: 'review_campaigns_not_configured' });
      return services.campaigns.list(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/review-campaigns',
    async (request, reply) => {
      if (!isCreateCampaignInput(request.body)) {
        return reply.code(400).send({ error: 'invalid_review_campaign' });
      }
      if (!services.campaigns)
        return reply.code(501).send({ error: 'review_campaigns_not_configured' });
      try {
        return await services.campaigns.create(request.params.tenantId, request.body);
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'review_campaign_creation_failed',
        });
      }
    },
  );
  app.post<{
    Params: { tenantId: string; campaignId: string; taskId: string };
    Body: unknown;
  }>(
    '/v1/tenants/:tenantId/review-campaigns/:campaignId/tasks/:taskId/decisions',
    async (request, reply) => {
      if (!isCampaignDecisionInput(request.body)) {
        return reply.code(400).send({ error: 'invalid_campaign_decision' });
      }
      if (!services.campaigns)
        return reply.code(501).send({ error: 'review_campaigns_not_configured' });
      try {
        const campaign = await services.campaigns.decide(
          request.params.tenantId,
          request.params.campaignId,
          request.params.taskId,
          request.body,
        );
        return campaign ?? reply.code(404).send({ error: 'review_campaign_task_not_found' });
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'campaign_decision_failed',
        });
      }
    },
  );
  return app;
}
