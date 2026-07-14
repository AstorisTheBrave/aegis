import Fastify from 'fastify';
import type {
  EvidenceBundle,
  IdentitySummary,
  RecordedReviewDecision,
  ReviewDecisionInput,
} from '@aegis/api-contract';
import type {
  AccessGraphRepository,
  Identity,
  JsonValue,
} from '@open-saas-governance/access-graph';
import { GraphFindingReader, type FindingReader } from './findings.js';

export type { FindingReader } from './findings.js';

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
  readonly reviews?: ReviewDecisionRecorder;
  readonly evidence?: EvidenceExporter;
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
  return app;
}
