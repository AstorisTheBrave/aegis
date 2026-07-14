import Fastify from 'fastify';
import type {
  AssignCatalogOwnersInput,
  ApproveActionInput,
  CreateActionInput,
  CreatePolicyReviewCampaignInput,
  DryRunWorkflowInput,
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
import type { PolicyReviewCampaignManager, ReviewCampaignManager } from './review-campaigns.js';
import type { ExtensionRegistryManager } from './extensions.js';
import type { DiscoveryManager } from './discovery.js';
import type { DiscoveryReviewPolicyManager } from './review-policies.js';
import type { WorkflowManager } from './workflows.js';
import type { ActionManager, OffboardingActionInput } from './actions.js';
import type { ProviderCertificationManager, ProviderCertificationInput } from './certifications.js';
import type { AccessRequestManager } from './access-requests.js';
import type { CreateAccessRequestInput } from '@aegis/access-requests';
import type { CreateTestTenantActivationInput } from '@aegis/provider-certification';
import type { AssistanceManager } from './assistance.js';
import type { AssistanceRequest, UpdateAssistanceSettingsInput } from '@aegis/assistance';

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
  readonly reviewPolicies?: DiscoveryReviewPolicyManager;
  readonly policyCampaigns?: PolicyReviewCampaignManager;
  readonly workflows?: WorkflowManager;
  readonly actions?: ActionManager;
  readonly certifications?: ProviderCertificationManager;
  readonly accessRequests?: AccessRequestManager;
  readonly assistance?: AssistanceManager;
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

function isCreatePolicyCampaignInput(value: unknown): value is CreatePolicyReviewCampaignInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.title === 'string' &&
    typeof input.actor === 'string' &&
    (!('policyIds' in input) ||
      (Array.isArray(input.policyIds) && input.policyIds.every((id) => typeof id === 'string'))) &&
    (!('fallbackReviewer' in input) || typeof input.fallbackReviewer === 'string') &&
    (!('dueAt' in input) || typeof input.dueAt === 'string')
  );
}

function isDryRunWorkflowInput(value: unknown): value is DryRunWorkflowInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.templateId === 'string' &&
    typeof input.actor === 'string' &&
    Array.isArray(input.sourceFacts) &&
    input.sourceFacts.every(
      (fact) =>
        !!fact &&
        typeof fact === 'object' &&
        typeof (fact as Record<string, unknown>).id === 'string' &&
        typeof (fact as Record<string, unknown>).kind === 'string' &&
        typeof (fact as Record<string, unknown>).label === 'string' &&
        typeof (fact as Record<string, unknown>).observedAt === 'string',
    ) &&
    (!('simulateFailureStepIds' in input) || isStringArray(input.simulateFailureStepIds))
  );
}

function isCreateActionInput(value: unknown): value is CreateActionInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  const target = input.target as Record<string, unknown> | undefined;
  return (
    ['mock-github', 'mock-okta', 'mock-google-workspace'].includes(String(input.provider)) &&
    ['disable_account', 'revoke_sessions', 'remove_group_membership'].includes(
      String(input.kind),
    ) &&
    !!target &&
    typeof target.subjectId === 'string' &&
    typeof target.displayName === 'string' &&
    typeof input.requestedBy === 'string' &&
    isStringArray(input.requiredScopes) &&
    typeof input.idempotencyKey === 'string' &&
    typeof input.rollbackNarrative === 'string' &&
    (!('workflowExecutionId' in input) || typeof input.workflowExecutionId === 'string') &&
    (!('maxAttempts' in input) || typeof input.maxAttempts === 'number')
  );
}

function isApproveActionInput(value: unknown): value is ApproveActionInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  const breakGlass = input.breakGlass as Record<string, unknown> | undefined;
  return (
    typeof input.approver === 'string' &&
    typeof input.reason === 'string' &&
    (!('breakGlass' in input) ||
      (!!breakGlass &&
        typeof breakGlass.reason === 'string' &&
        typeof breakGlass.expiresAt === 'string'))
  );
}

function isExecutorInput(value: unknown): value is { executor: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).executor === 'string'
  );
}

function isOffboardingActionInput(value: unknown): value is OffboardingActionInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  const target = input.target as Record<string, unknown> | undefined;
  return (
    !!target &&
    typeof target.subjectId === 'string' &&
    typeof target.displayName === 'string' &&
    typeof input.requestedBy === 'string'
  );
}

function isTestTenantActivationInput(value: unknown): value is CreateTestTenantActivationInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return (
    ['mock-github', 'mock-okta', 'mock-google-workspace'].includes(String(input.provider)) &&
    input.environment === 'test' &&
    Array.isArray(input.allowedActionKinds) &&
    input.allowedActionKinds.every((kind) =>
      ['disable_account', 'revoke_sessions', 'remove_group_membership'].includes(String(kind)),
    ) &&
    isStringArray(input.grantedScopes) &&
    typeof input.activatedBy === 'string' &&
    typeof input.expiresAt === 'string'
  );
}

function isProviderCertificationInput(value: unknown): value is ProviderCertificationInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  const manifest = input.manifest as Record<string, unknown> | undefined;
  const fixture = input.fixture as Record<string, unknown> | undefined;
  return (
    typeof input.activationId === 'string' &&
    typeof input.certifiedBy === 'string' &&
    !!manifest &&
    typeof manifest.protocolVersion === 'string' &&
    typeof manifest.id === 'string' &&
    typeof manifest.vendor === 'string' &&
    isStringArray(manifest.capabilities) &&
    isStringArray(manifest.authenticationModes) &&
    isStringArray(manifest.minimumScopes) &&
    typeof manifest.imageDigest === 'string' &&
    !!fixture &&
    typeof fixture.provider === 'string' &&
    Array.isArray(fixture.exchanges) &&
    fixture.exchanges.every(
      (exchange) =>
        !!exchange &&
        typeof exchange === 'object' &&
        typeof (exchange as Record<string, unknown>).method === 'string' &&
        typeof (exchange as Record<string, unknown>).url === 'string' &&
        typeof (exchange as Record<string, unknown>).responseStatus === 'number',
    ) &&
    Array.isArray(input.actionProbes) &&
    input.actionProbes.length > 0 &&
    input.actionProbes.every(
      (probe) =>
        !!probe &&
        typeof probe === 'object' &&
        ['disable_account', 'revoke_sessions', 'remove_group_membership'].includes(
          String((probe as Record<string, unknown>).kind),
        ) &&
        isStringArray((probe as Record<string, unknown>).requiredScopes),
    )
  );
}
function isAccessRequestInput(value: unknown): value is CreateAccessRequestInput {
  if (!value || typeof value !== 'object') return false;
  const x = value as Record<string, unknown>;
  return (
    typeof x.catalogItemId === 'string' &&
    typeof x.requester === 'string' &&
    typeof x.rationale === 'string' &&
    typeof x.durationMinutes === 'number' &&
    typeof x.idempotencyKey === 'string'
  );
}
function isAccessDecisionInput(
  value: unknown,
): value is { reviewer: string; approved: boolean; reason: string } {
  if (!value || typeof value !== 'object') return false;
  const x = value as Record<string, unknown>;
  return (
    typeof x.reviewer === 'string' &&
    typeof x.approved === 'boolean' &&
    typeof x.reason === 'string'
  );
}
function isAssistanceSettingsInput(value: unknown): value is UpdateAssistanceSettingsInput {
  if (!value || typeof value !== 'object') return false;
  const x = value as Record<string, unknown>;
  return (
    typeof x.enabled === 'boolean' &&
    isStringArray(x.allowedProviders) &&
    typeof x.budgetPerRequest === 'number' &&
    typeof x.actor === 'string' &&
    !('credentials' in x) &&
    !('providerUrl' in x)
  );
}
function isAssistanceRequest(value: unknown): value is AssistanceRequest {
  if (!value || typeof value !== 'object') return false;
  const x = value as Record<string, unknown>;
  return (
    ['evidence_summary', 'recommendation_draft', 'workflow_draft'].includes(String(x.kind)) &&
    typeof x.providerId === 'string' &&
    typeof x.actor === 'string' &&
    typeof x.promptVersion === 'string' &&
    Array.isArray(x.sourceFacts) &&
    x.sourceFacts.every(
      (fact) =>
        !!fact &&
        typeof fact === 'object' &&
        typeof (fact as Record<string, unknown>).id === 'string' &&
        typeof (fact as Record<string, unknown>).label === 'string' &&
        typeof (fact as Record<string, unknown>).observedAt === 'string',
    ) &&
    (!('instruction' in x) || typeof x.instruction === 'string') &&
    !('credentials' in x) &&
    !('providerUrl' in x)
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
  const app = Fastify({
    logger: true,
    bodyLimit: 1_048_576,
    routerOptions: { maxParamLength: 512 },
  });
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'no-referrer');
    if (request.url.startsWith('/v1/')) reply.header('cache-control', 'no-store');
  });
  const findings = services.findings ?? new GraphFindingReader(graph);
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/assistance/settings',
    async (request, reply) => {
      if (!services.assistance) return reply.code(501).send({ error: 'assistance_not_configured' });
      return services.assistance.settings(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/assistance/settings',
    async (request, reply) => {
      if (!isAssistanceSettingsInput(request.body))
        return reply.code(400).send({ error: 'invalid_assistance_settings' });
      if (!services.assistance) return reply.code(501).send({ error: 'assistance_not_configured' });
      try {
        return await services.assistance.updateSettings(request.params.tenantId, request.body);
      } catch (cause) {
        return reply
          .code(400)
          .send({ error: cause instanceof Error ? cause.message : 'assistance_settings_failed' });
      }
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/assistance',
    async (request, reply) => {
      if (!isAssistanceRequest(request.body))
        return reply.code(400).send({ error: 'invalid_assistance_request' });
      if (!services.assistance) return reply.code(501).send({ error: 'assistance_not_configured' });
      try {
        return await services.assistance.assist(request.params.tenantId, request.body);
      } catch (cause) {
        return reply
          .code(400)
          .send({ error: cause instanceof Error ? cause.message : 'assistance_failed' });
      }
    },
  );
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/access-requests',
    async (request, reply) => {
      if (!services.accessRequests)
        return reply.code(501).send({ error: 'access_requests_not_configured' });
      return services.accessRequests.list(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/access-requests',
    async (request, reply) => {
      if (!isAccessRequestInput(request.body))
        return reply.code(400).send({ error: 'invalid_access_request' });
      if (!services.accessRequests)
        return reply.code(501).send({ error: 'access_requests_not_configured' });
      try {
        return await services.accessRequests.create(request.params.tenantId, request.body);
      } catch (cause) {
        return reply
          .code(400)
          .send({ error: cause instanceof Error ? cause.message : 'access_request_failed' });
      }
    },
  );
  app.post<{ Params: { tenantId: string; requestId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/access-requests/:requestId/decisions',
    async (request, reply) => {
      if (!isAccessDecisionInput(request.body))
        return reply.code(400).send({ error: 'invalid_access_request_decision' });
      if (!services.accessRequests)
        return reply.code(501).send({ error: 'access_requests_not_configured' });
      try {
        return await services.accessRequests.decide(
          request.params.tenantId,
          request.params.requestId,
          request.body,
        );
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'access_request_decision_failed',
        });
      }
    },
  );
  app.post<{ Params: { tenantId: string; requestId: string } }>(
    '/v1/tenants/:tenantId/access-requests/:requestId/activate',
    async (request, reply) => {
      if (!services.accessRequests)
        return reply.code(501).send({ error: 'access_requests_not_configured' });
      try {
        return await services.accessRequests.activate(
          request.params.tenantId,
          request.params.requestId,
        );
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'access_request_activation_failed',
        });
      }
    },
  );
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/test-activations',
    async (request, reply) => {
      if (!services.certifications)
        return reply.code(501).send({ error: 'provider_certification_not_configured' });
      return services.certifications.listActivations(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/test-activations',
    async (request, reply) => {
      if (!isTestTenantActivationInput(request.body))
        return reply.code(400).send({ error: 'invalid_test_tenant_activation' });
      if (!services.certifications)
        return reply.code(501).send({ error: 'provider_certification_not_configured' });
      try {
        return await services.certifications.activate(request.params.tenantId, request.body);
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'test_tenant_activation_failed',
        });
      }
    },
  );
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/provider-certifications',
    async (request, reply) => {
      if (!services.certifications)
        return reply.code(501).send({ error: 'provider_certification_not_configured' });
      return services.certifications.listCertifications(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/provider-certifications',
    async (request, reply) => {
      if (!isProviderCertificationInput(request.body))
        return reply.code(400).send({ error: 'invalid_provider_certification' });
      if (!services.certifications)
        return reply.code(501).send({ error: 'provider_certification_not_configured' });
      try {
        return await services.certifications.certify(request.params.tenantId, request.body);
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'provider_certification_failed',
        });
      }
    },
  );
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/actions',
    async (request, reply) => {
      if (!services.actions) return reply.code(501).send({ error: 'actions_not_configured' });
      return services.actions.list(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/actions',
    async (request, reply) => {
      if (!isCreateActionInput(request.body))
        return reply.code(400).send({ error: 'invalid_action' });
      if (!services.actions) return reply.code(501).send({ error: 'actions_not_configured' });
      try {
        return await services.actions.request(request.params.tenantId, request.body);
      } catch (cause) {
        return reply
          .code(400)
          .send({ error: cause instanceof Error ? cause.message : 'action_request_failed' });
      }
    },
  );
  app.post<{ Params: { tenantId: string; actionId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/actions/:actionId/approve',
    async (request, reply) => {
      if (!isApproveActionInput(request.body))
        return reply.code(400).send({ error: 'invalid_action_approval' });
      if (!services.actions) return reply.code(501).send({ error: 'actions_not_configured' });
      try {
        return await services.actions.approve(
          request.params.tenantId,
          request.params.actionId,
          request.body,
        );
      } catch (cause) {
        return reply
          .code(400)
          .send({ error: cause instanceof Error ? cause.message : 'action_approval_failed' });
      }
    },
  );
  app.post<{ Params: { tenantId: string; actionId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/actions/:actionId/execute',
    async (request, reply) => {
      if (!isExecutorInput(request.body))
        return reply.code(400).send({ error: 'invalid_action_executor' });
      if (!services.actions) return reply.code(501).send({ error: 'actions_not_configured' });
      try {
        return await services.actions.execute(
          request.params.tenantId,
          request.params.actionId,
          request.body.executor,
        );
      } catch (cause) {
        return reply
          .code(400)
          .send({ error: cause instanceof Error ? cause.message : 'action_execution_failed' });
      }
    },
  );
  app.post<{ Params: { tenantId: string; actionId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/actions/:actionId/compensate',
    async (request, reply) => {
      if (!isExecutorInput(request.body))
        return reply.code(400).send({ error: 'invalid_action_executor' });
      if (!services.actions) return reply.code(501).send({ error: 'actions_not_configured' });
      try {
        return await services.actions.compensate(
          request.params.tenantId,
          request.params.actionId,
          request.body.executor,
        );
      } catch (cause) {
        return reply
          .code(400)
          .send({ error: cause instanceof Error ? cause.message : 'action_compensation_failed' });
      }
    },
  );
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/actions/evidence/export',
    async (request, reply) => {
      if (!services.actions) return reply.code(501).send({ error: 'actions_not_configured' });
      return services.actions.exportEvidence(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string; executionId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/workflow-executions/:executionId/offboarding-actions',
    async (request, reply) => {
      if (!isOffboardingActionInput(request.body))
        return reply.code(400).send({ error: 'invalid_offboarding_action' });
      if (!services.actions || !services.workflows)
        return reply.code(501).send({ error: 'actions_not_configured' });
      const execution = (await services.workflows.listExecutions(request.params.tenantId)).find(
        (item) => item.id === request.params.executionId,
      );
      if (!execution) return reply.code(404).send({ error: 'workflow_execution_not_found' });
      try {
        return await services.actions.requestOffboarding(
          request.params.tenantId,
          request.params.executionId,
          request.body,
        );
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'offboarding_action_request_failed',
        });
      }
    },
  );
  app.get('/v1/workflow-templates', async (_request, reply) => {
    if (!services.workflows) return reply.code(501).send({ error: 'workflows_not_configured' });
    return services.workflows.listTemplates();
  });
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/workflow-executions',
    async (request, reply) => {
      if (!services.workflows) return reply.code(501).send({ error: 'workflows_not_configured' });
      return services.workflows.listExecutions(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/workflows/dry-run',
    async (request, reply) => {
      if (!isDryRunWorkflowInput(request.body)) {
        return reply.code(400).send({ error: 'invalid_dry_run_workflow' });
      }
      if (!services.workflows) return reply.code(501).send({ error: 'workflows_not_configured' });
      try {
        return await services.workflows.dryRun(request.params.tenantId, request.body);
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'workflow_dry_run_failed',
        });
      }
    },
  );
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/review-policies',
    async (request, reply) => {
      if (!services.reviewPolicies)
        return reply.code(501).send({ error: 'review_policies_not_configured' });
      return services.reviewPolicies.list(request.params.tenantId);
    },
  );
  app.get<{ Params: { tenantId: string } }>(
    '/v1/tenants/:tenantId/policy-review-campaigns',
    async (request, reply) => {
      if (!services.policyCampaigns) {
        return reply.code(501).send({ error: 'policy_review_campaigns_not_configured' });
      }
      return services.policyCampaigns.list(request.params.tenantId);
    },
  );
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/v1/tenants/:tenantId/policy-review-campaigns',
    async (request, reply) => {
      if (!isCreatePolicyCampaignInput(request.body)) {
        return reply.code(400).send({ error: 'invalid_policy_review_campaign' });
      }
      if (!services.policyCampaigns) {
        return reply.code(501).send({ error: 'policy_review_campaigns_not_configured' });
      }
      try {
        return await services.policyCampaigns.create(request.params.tenantId, request.body);
      } catch (cause) {
        return reply.code(400).send({
          error: cause instanceof Error ? cause.message : 'policy_review_campaign_creation_failed',
        });
      }
    },
  );
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
