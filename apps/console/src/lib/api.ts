import type {
  CatalogApplication,
  CatalogOwner,
  CampaignEvidenceBundle,
  EvidenceBundle,
  FindingDetail,
  FindingListItem,
  IdentitySummary,
  RecordedReviewDecision,
  ReviewDecision,
  ReviewCampaignSummary,
  DiscoveryQueueItem,
  PolicyEvaluation,
  DryRunWorkflowInput,
  WorkflowDefinition,
  WorkflowExecution,
  ControlledAction,
  TestTenantActivationSummary,
  AccessRequest,
  CreateAccessRequestInput,
} from '@aegis/api-contract';

export type {
  AccessStatus,
  CampaignEvidenceBundle,
  EvidenceBundle,
  FindingDetail,
  FindingListItem,
  FindingEvidence,
  IdentitySummary,
  RecordedReviewDecision,
  ReviewDecision,
  ReviewCampaignSummary,
  CatalogApplication,
  CatalogOwner,
  DiscoveryQueueItem,
  PolicyEvaluation,
  DryRunWorkflowInput,
  WorkflowDefinition,
  WorkflowExecution,
  ControlledAction,
  TestTenantActivationSummary,
  AccessRequest,
  CreateAccessRequestInput,
} from '@aegis/api-contract';

export interface AegisApi {
  listIdentities(tenantId: string, query: string): Promise<readonly IdentitySummary[]>;
  getFinding(tenantId: string, findingId: string): Promise<FindingDetail | undefined>;
  listFindings(tenantId: string): Promise<readonly FindingListItem[]>;
  submitReviewDecision(
    tenantId: string,
    itemId: string,
    input: { decision: ReviewDecision; comment: string },
  ): Promise<RecordedReviewDecision>;
  exportEvidence(tenantId: string): Promise<EvidenceBundle>;
  listReviewCampaigns(tenantId: string): Promise<readonly ReviewCampaignSummary[]>;
  listReviewPolicies(tenantId: string): Promise<readonly PolicyEvaluation[]>;
  createPolicyReviewCampaign(
    tenantId: string,
    input: {
      title: string;
      policyIds?: readonly PolicyEvaluation['policyId'][];
      fallbackReviewer?: string;
      actor: string;
    },
  ): Promise<ReviewCampaignSummary>;
  recordCampaignDecision(
    tenantId: string,
    campaignId: string,
    taskId: string,
    input: {
      decision: 'retain' | 'remove_recommended' | 'delegate' | 'exception';
      reviewer: string;
      rationale: string;
    },
  ): Promise<ReviewCampaignSummary>;
  exportCampaignEvidence(tenantId: string, campaignId: string): Promise<CampaignEvidenceBundle>;
  listCatalog(tenantId: string): Promise<readonly CatalogApplication[]>;
  listDiscoveryQueue(tenantId: string): Promise<readonly DiscoveryQueueItem[]>;
  assignCatalogOwners(
    tenantId: string,
    applicationId: string,
    owners: readonly CatalogOwner[],
  ): Promise<CatalogApplication>;
  listWorkflowTemplates(): Promise<readonly WorkflowDefinition[]>;
  dryRunWorkflow(tenantId: string, input: DryRunWorkflowInput): Promise<WorkflowExecution>;
  listActions(tenantId: string): Promise<readonly ControlledAction[]>;
  listTestActivations(tenantId: string): Promise<readonly TestTenantActivationSummary[]>;
  approveAction(
    tenantId: string,
    actionId: string,
    input: { approver: string; reason: string; breakGlass?: { reason: string; expiresAt: string } },
  ): Promise<ControlledAction>;
  executeAction(tenantId: string, actionId: string, executor: string): Promise<ControlledAction>;
  compensateAction(tenantId: string, actionId: string, executor: string): Promise<ControlledAction>;
  requestOffboardingActions(
    tenantId: string,
    executionId: string,
    input: { target: { subjectId: string; displayName: string }; requestedBy: string },
  ): Promise<readonly ControlledAction[]>;
  listAccessRequests(tenantId: string): Promise<readonly AccessRequest[]>;
  createAccessRequest(tenantId: string, input: CreateAccessRequestInput): Promise<AccessRequest>;
  decideAccessRequest(
    tenantId: string,
    requestId: string,
    input: { reviewer: string; approved: boolean; reason: string },
  ): Promise<AccessRequest>;
  activateAccessRequest(tenantId: string, requestId: string): Promise<AccessRequest>;
}

let sampleActions: readonly ControlledAction[] = [
  {
    schemaVersion: 'action.v2',
    id: 'action:mock-okta:alice',
    tenantId: 'acme-platform',
    provider: 'mock-okta',
    kind: 'disable_account',
    target: { subjectId: 'alice-example', displayName: 'Alice Example' },
    requestedBy: 'Aegis Admin',
    requestedAt: '2026-07-14T18:00:00.000Z',
    requiredScopes: ['users.disable'],
    idempotencyKey: 'demo:alice:okta',
    rollbackNarrative: 'Re-enable the mock IdP account and restore session policy.',
    maxAttempts: 3,
    status: 'requested',
    approvals: [],
    executions: [],
    providerMutation: false,
  },
];

const sampleTestActivations: readonly TestTenantActivationSummary[] = [
  {
    id: 'test-activation:demo-okta',
    provider: 'mock-okta',
    environment: 'test',
    allowedActionKinds: ['disable_account'],
    grantedScopes: ['users.disable'],
    activatedBy: 'operator@acme.dev',
    activatedAt: '2026-07-14T18:00:00.000Z',
    expiresAt: '2026-07-15T18:00:00.000Z',
  },
];

let sampleAccessRequests: readonly AccessRequest[] = [
  {
    schemaVersion: 'access-request.v1',
    id: 'access-request:demo-1',
    tenantId: 'acme-platform',
    catalogItem: {
      id: 'github-maintain',
      title: 'GitHub maintain access',
      provider: 'mock-github',
      entitlement: 'maintain',
      reviewer: 'resource-owner@acme.dev',
      maxDurationMinutes: 240,
    },
    requester: 'alice.example@acme.dev',
    rationale: 'Investigate a time-sensitive deployment incident.',
    durationMinutes: 60,
    requestedAt: '2026-07-14T20:00:00.000Z',
    status: 'pending',
    idempotencyKey: 'demo:access-request:1',
    simulatedFulfillment: { requiresControlledAction: true, providerMutation: false },
  },
];

const sampleCatalog: readonly CatalogApplication[] = [
  {
    tenantId: 'acme-platform',
    id: 'slack',
    vendorName: 'Slack',
    normalizedName: 'slack',
    domains: ['slack.com'],
    aliases: ['slack technologies'],
    category: 'Collaboration',
    riskTier: 'high',
    dataClassification: 'confidential',
    recommendation: 'monitor',
    owners: [],
    approvedAlternatives: ['Mattermost'],
    renewalAt: '2026-12-01T00:00:00.000Z',
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
  },
  {
    tenantId: 'acme-platform',
    id: 'github',
    vendorName: 'GitHub',
    normalizedName: 'github',
    domains: ['github.com'],
    aliases: [],
    category: 'Engineering',
    riskTier: 'critical',
    dataClassification: 'restricted',
    recommendation: 'monitor',
    owners: [
      { identityId: 'alice-example', role: 'technical', assignedAt: '2026-07-14T00:00:00.000Z' },
    ],
    approvedAlternatives: [],
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
  },
];

const sampleDiscoveryQueue: readonly DiscoveryQueueItem[] = [
  {
    observation: {
      tenantId: 'acme-platform',
      id: 'sso:slack:1',
      source: 'sso_log',
      sourceReference: 'sign-in/slack',
      vendorName: 'Slack',
      domain: 'slack.com',
      observedAt: '2026-07-14T08:00:00.000Z',
      activityCount: 0,
      identityType: 'service_account',
      metadata: { eventKind: 'signin' },
    },
    application: sampleCatalog[0],
    reasons: ['missing_owner', 'high_risk', 'unused_license', 'non_human_access'],
    recommendation: 'monitor',
    usage: {
      tenantId: 'acme-platform',
      appId: 'slack',
      observationId: 'sso:slack:1',
      observedAt: '2026-07-14T08:00:00.000Z',
      activityCount: 0,
      source: 'sso_log',
    },
  },
  {
    observation: {
      tenantId: 'acme-platform',
      id: 'finance:design-tool:1',
      source: 'finance',
      sourceReference: 'expense/2026-07-001',
      vendorName: 'Design Tool',
      domain: 'design-tool.example',
      observedAt: '2026-07-13T12:00:00.000Z',
      activityCount: 2,
      identityType: 'human',
    },
    reasons: ['unknown_app'],
    recommendation: 'monitor',
    usage: {
      tenantId: 'acme-platform',
      observationId: 'finance:design-tool:1',
      observedAt: '2026-07-13T12:00:00.000Z',
      activityCount: 2,
      source: 'finance',
    },
  },
];

const sampleIdentities: readonly IdentitySummary[] = [
  {
    id: 'alice-example',
    displayName: 'Alice Example',
    email: 'alice.example@acme.dev',
    source: 'GitHub',
    sourceAccount: 'acme',
    platform: 'acme/platform',
    platformType: 'Kubernetes',
    status: 'requires_review',
    privileged: true,
    lastSeen: '1h ago',
  },
  {
    id: 'bob-weaver',
    displayName: 'Bob Weaver',
    email: 'bob.weaver@acme.dev',
    source: 'Google Workspace',
    sourceAccount: 'acme.dev',
    platform: 'cloud/production',
    platformType: 'AWS',
    status: 'active',
    privileged: true,
    lastSeen: '2h ago',
  },
  {
    id: 'carol-lee',
    displayName: 'Carol Lee',
    email: 'carol.lee@acme.dev',
    source: 'GitHub',
    sourceAccount: 'acme',
    platform: 'acme/payments',
    platformType: 'Kubernetes',
    status: 'active',
    privileged: false,
    lastSeen: '3h ago',
  },
  {
    id: 'david-grant',
    displayName: 'David Grant',
    email: 'david.grant@acme.dev',
    source: 'Okta',
    sourceAccount: 'acme',
    platform: 'cloud/production',
    platformType: 'AWS',
    status: 'active',
    privileged: false,
    lastSeen: '4h ago',
  },
  {
    id: 'emma-rogers',
    displayName: 'Emma Rogers',
    email: 'emma.rogers@acme.dev',
    source: 'Google Workspace',
    sourceAccount: 'acme.dev',
    platform: 'acme/observability',
    platformType: 'Grafana',
    status: 'active',
    privileged: false,
    lastSeen: '5h ago',
  },
  {
    id: 'frank-wright',
    displayName: 'Frank Wright',
    email: 'frank.wright@acme.dev',
    source: 'GitHub',
    sourceAccount: 'acme',
    platform: 'acme/platform',
    platformType: 'Kubernetes',
    status: 'suspended',
    privileged: false,
    lastSeen: '1d ago',
  },
  {
    id: 'grace-ruiz',
    displayName: 'Grace Ruiz',
    email: 'grace.ruiz@acme.dev',
    source: 'Okta',
    sourceAccount: 'acme',
    platform: 'cloud/production',
    platformType: 'AWS',
    status: 'requires_review',
    privileged: true,
    lastSeen: '1d ago',
  },
  {
    id: 'hank-roberts',
    displayName: 'Hank Roberts',
    email: 'hank.roberts@acme.dev',
    source: 'GitHub',
    sourceAccount: 'acme',
    platform: 'acme/security',
    platformType: 'Kubernetes',
    status: 'active',
    privileged: false,
    lastSeen: '2d ago',
  },
  {
    id: 'ian-morris',
    displayName: 'Ian Morris',
    email: 'ian.morris@acme.dev',
    source: 'Google Workspace',
    sourceAccount: 'acme.dev',
    platform: 'acme/analytics',
    platformType: 'BigQuery',
    status: 'active',
    privileged: false,
    lastSeen: '2d ago',
  },
  {
    id: 'jules-park',
    displayName: 'Jules Park',
    email: 'jules.park@acme.dev',
    source: 'GitHub',
    sourceAccount: 'acme',
    platform: 'acme/platform',
    platformType: 'Kubernetes',
    status: 'active',
    privileged: false,
    lastSeen: '3d ago',
  },
];

const sampleFinding: FindingDetail = {
  id: 'PRV-2025-00073',
  severity: 'high',
  title: 'Privileged access requires review',
  identity: 'Alice Example',
  source: 'GitHub (acme)',
  resource: 'acme/platform',
  access: 'Maintain',
  policy: 'Privileged access requires review',
  firstSeen: '14 Jun 2025',
  lastSeen: '1h ago',
  status: 'open',
  evidence: [
    {
      id: 'evt_01',
      kind: 'RoleBinding',
      title: 'alice-example-cluster-admin',
      detail: 'Assigned by platform-admins',
    },
    { id: 'evt_02', kind: 'ClusterRole', title: 'cluster-admin', detail: 'Privileged role' },
    { id: 'evt_03', kind: 'GitHub team', title: 'platform-admins', detail: 'Inherited membership' },
  ],
};

const sampleCampaigns: readonly ReviewCampaignSummary[] = [
  {
    id: 'campaign:github-july-2025',
    title: 'GitHub elevated access review',
    createdAt: '2025-06-14T10:00:00.000Z',
    dueAt: '2025-07-01T00:00:00.000Z',
    status: 'open',
    tasks: [
      {
        id: 'task:alice',
        findingId: 'PRV-2025-00073',
        findingTitle: 'Privileged access requires review',
        severity: 'high',
        assignedReviewer: 'platform-owner@acme.dev',
        route: 'resource_owner',
        status: 'open',
        decisionCount: 0,
        decisions: [],
      },
    ],
  },
];

const sampleReviewPolicies: readonly PolicyEvaluation[] = [
  {
    policyId: 'application-owner.v1',
    subject: {
      id: 'slack',
      tenantId: 'acme-platform',
      kind: 'application',
      displayName: 'Slack',
      owners: [],
      sourceReferences: ['slack.com'],
    },
    recommendation: 'review_required',
    reasons: ['missing_owner'],
    evidence: [{ sourceReference: 'slack.com', observedAt: '2026-07-14T00:00:00.000Z' }],
  },
  {
    policyId: 'non-human-identity.v1',
    subject: {
      id: 'sso:slack:1',
      tenantId: 'acme-platform',
      kind: 'non_human_identity',
      displayName: 'Slack service account',
      owners: [],
      sourceReferences: ['sign-in/slack'],
      identityType: 'service_account',
    },
    recommendation: 'review_required',
    reasons: ['missing_owner', 'non_human_identity'],
    evidence: [{ sourceReference: 'sign-in/slack', observedAt: '2026-07-14T08:00:00.000Z' }],
  },
];

const sampleWorkflowTemplates: readonly WorkflowDefinition[] = [
  {
    schemaVersion: 'workflow.v1',
    id: 'leaver.v1',
    version: '1.0.0',
    title: 'Leaver',
    trigger: 'hris',
    steps: [
      {
        id: 'owner-approval',
        kind: 'approval',
        title: 'Owner approval',
        approverRole: 'resource owner',
      },
      {
        id: 'simulate-provider-action',
        kind: 'provider_action',
        title: 'Simulate account disable',
        provider: 'target provider',
        capability: 'disable account',
        affectedSubject: 'source-linked subject',
        requiredScopes: ['governance.simulate'],
        idempotencyKey: 'leaver:{{subject}}',
        retry: { maxAttempts: 3, backoffSeconds: 60 },
        rollbackNarrative: 'No provider action occurs during dry run.',
        providerMutation: false,
      },
    ],
  },
];

function matchesQuery(identity: IdentitySummary, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return (
    !normalized ||
    [identity.displayName, identity.email, identity.source, identity.platform].some((value) =>
      value.toLowerCase().includes(normalized),
    )
  );
}

export const demoApi: AegisApi = {
  async listIdentities(_tenantId, query) {
    return sampleIdentities.filter((identity) => matchesQuery(identity, query));
  },
  async getFinding(_tenantId, findingId) {
    return findingId === sampleFinding.id ? sampleFinding : undefined;
  },
  async listFindings() {
    return [
      {
        id: sampleFinding.id,
        type: 'PRIVILEGED_ACCESS',
        severity: sampleFinding.severity,
        title: sampleFinding.title,
        identity: sampleFinding.identity,
        resource: sampleFinding.resource,
        lastSeen: sampleFinding.lastSeen,
        status: sampleFinding.status,
      },
    ];
  },
  async submitReviewDecision(_tenantId, itemId, input) {
    return { itemId, ...input, recordedAt: new Date().toISOString() };
  },
  async exportEvidence(tenantId) {
    if (!tenantId) throw new Error('A tenant ID is required for evidence export.');
    const payload = { tenantId, exportedAt: new Date().toISOString(), records: [] };
    return {
      ...payload,
      sha256: '67b6c5d8f9475c816e3c60b7a7de3407cc9f30e2bf6fdbb98937482a13edcb97',
    };
  },
  async listReviewCampaigns() {
    return sampleCampaigns;
  },
  async listReviewPolicies() {
    return sampleReviewPolicies;
  },
  async createPolicyReviewCampaign(_tenantId, input) {
    return {
      id: `campaign:policy:${input.title.toLowerCase().replaceAll(' ', '-')}`,
      title: input.title,
      createdAt: new Date().toISOString(),
      status: 'open',
      tasks: [],
    };
  },
  async listWorkflowTemplates() {
    return sampleWorkflowTemplates;
  },
  async dryRunWorkflow(tenantId, input) {
    const template = sampleWorkflowTemplates.find((item) => item.id === input.templateId);
    if (!template) throw new Error('The requested workflow template was not found.');
    const createdAt = new Date().toISOString();
    return {
      id: `dry-run:${tenantId}:${template.id}:${createdAt}:demo`,
      tenantId,
      definitionId: template.id,
      definitionVersion: template.version,
      createdAt,
      actor: input.actor,
      status: 'requires_approval',
      sourceFacts: input.sourceFacts,
      providerMutation: false,
      preview: template.steps.map((step) => ({
        stepId: step.id,
        kind: step.kind,
        title: step.title,
        status: step.kind === 'approval' ? 'pending_approval' : 'planned',
        requiredScopes: step.kind === 'provider_action' ? step.requiredScopes : [],
        ...(step.kind === 'provider_action'
          ? { rollbackNarrative: step.rollbackNarrative, retry: step.retry }
          : {}),
        providerMutation: false,
      })),
    };
  },
  async listActions() {
    return sampleActions;
  },
  async listTestActivations() {
    return sampleTestActivations;
  },
  async approveAction(_tenantId, actionId, input) {
    const action = sampleActions.find((item) => item.id === actionId);
    if (!action) throw new Error('Action not found.');
    const approvedAt = new Date().toISOString();
    const updated: ControlledAction = {
      ...action,
      status: 'approved',
      approvals: [
        ...action.approvals,
        {
          actionId,
          approver: input.approver,
          reason: input.reason,
          approvedAt,
          ...(input.breakGlass ? { breakGlass: input.breakGlass } : {}),
        },
      ],
    };
    sampleActions = sampleActions.map((item) => (item.id === actionId ? updated : item));
    return updated;
  },
  async executeAction(_tenantId, actionId, executor) {
    const action = sampleActions.find((item) => item.id === actionId);
    if (!action) throw new Error('Action not found.');
    const now = new Date().toISOString();
    const updated: ControlledAction = {
      ...action,
      status: 'completed',
      executions: [
        ...action.executions,
        {
          actionId,
          attempt: action.executions.length + 1,
          executor,
          startedAt: now,
          completedAt: now,
          status: 'completed',
          providerReceipt: `mock:${action.provider}:${action.id}:applied`,
        },
      ],
    };
    sampleActions = sampleActions.map((item) => (item.id === actionId ? updated : item));
    return updated;
  },
  async compensateAction(_tenantId, actionId, executor) {
    const action = sampleActions.find((item) => item.id === actionId);
    if (!action) throw new Error('Action not found.');
    const now = new Date().toISOString();
    const updated: ControlledAction = {
      ...action,
      status: 'compensated',
      executions: [
        ...action.executions,
        {
          actionId,
          attempt: action.executions.length + 1,
          executor,
          startedAt: now,
          completedAt: now,
          status: 'compensated',
          providerReceipt: `mock:${action.provider}:${action.id}:compensated`,
        },
      ],
    };
    sampleActions = sampleActions.map((item) => (item.id === actionId ? updated : item));
    return updated;
  },
  async requestOffboardingActions(_tenantId, executionId, input) {
    const created = (['mock-okta', 'mock-google-workspace', 'mock-github'] as const).map(
      (provider, index): ControlledAction => ({
        schemaVersion: 'action.v2',
        id: `action:${executionId}:${provider}`,
        tenantId: 'acme-platform',
        workflowExecutionId: executionId,
        provider,
        kind:
          index === 2
            ? 'remove_group_membership'
            : index === 1
              ? 'revoke_sessions'
              : 'disable_account',
        target: input.target,
        requestedBy: input.requestedBy,
        requestedAt: new Date().toISOString(),
        requiredScopes:
          index === 2
            ? ['org.members.write']
            : index === 1
              ? ['sessions.revoke']
              : ['users.disable'],
        idempotencyKey: `${executionId}:${provider}`,
        rollbackNarrative: 'Restore the mock access state from immutable action evidence.',
        maxAttempts: 3,
        status: 'requested',
        approvals: [],
        executions: [],
        providerMutation: false,
      }),
    );
    const known = new Map(sampleActions.map((action) => [action.idempotencyKey, action]));
    sampleActions = [
      ...created.map((action) => known.get(action.idempotencyKey) ?? action),
      ...sampleActions,
    ];
    return created.map((action) => known.get(action.idempotencyKey) ?? action);
  },
  async listAccessRequests() {
    return sampleAccessRequests;
  },
  async createAccessRequest(tenantId, input) {
    const existing = sampleAccessRequests.find(
      (request) => request.tenantId === tenantId && request.idempotencyKey === input.idempotencyKey,
    );
    if (existing) return existing;
    const catalogItem =
      input.catalogItemId === 'okta-support'
        ? {
            id: 'okta-support',
            title: 'Okta support access',
            provider: 'mock-okta',
            entitlement: 'support',
            reviewer: 'resource-owner@acme.dev',
            maxDurationMinutes: 120,
          }
        : {
            id: 'github-maintain',
            title: 'GitHub maintain access',
            provider: 'mock-github',
            entitlement: 'maintain',
            reviewer: 'resource-owner@acme.dev',
            maxDurationMinutes: 240,
          };
    const created: AccessRequest = {
      schemaVersion: 'access-request.v1',
      id: `access-request:demo:${crypto.randomUUID()}`,
      tenantId,
      catalogItem,
      requester: input.requester,
      rationale: input.rationale,
      durationMinutes: input.durationMinutes,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      idempotencyKey: input.idempotencyKey,
      simulatedFulfillment: { requiresControlledAction: true, providerMutation: false },
    };
    sampleAccessRequests = [created, ...sampleAccessRequests];
    return created;
  },
  async decideAccessRequest(_tenantId, requestId, input) {
    const request = sampleAccessRequests.find((item) => item.id === requestId);
    if (!request) throw new Error('Access request not found.');
    const decidedAt = new Date().toISOString();
    const updated: AccessRequest = {
      ...request,
      status: input.approved ? 'approved' : 'denied',
      ...(input.approved
        ? { expiresAt: new Date(Date.now() + request.durationMinutes * 60_000).toISOString() }
        : {}),
      decision: { reviewer: input.reviewer, reason: input.reason, decidedAt },
    };
    sampleAccessRequests = sampleAccessRequests.map((item) =>
      item.id === requestId ? updated : item,
    );
    return updated;
  },
  async activateAccessRequest(_tenantId, requestId) {
    const request = sampleAccessRequests.find((item) => item.id === requestId);
    if (!request) throw new Error('Access request not found.');
    const updated: AccessRequest = { ...request, status: 'active' };
    sampleAccessRequests = sampleAccessRequests.map((item) =>
      item.id === requestId ? updated : item,
    );
    return updated;
  },
  async recordCampaignDecision(_tenantId, campaignId) {
    const campaign = sampleCampaigns.find((candidate) => candidate.id === campaignId);
    if (!campaign) throw new Error('The requested review campaign was not found.');
    return campaign;
  },
  async exportCampaignEvidence(tenantId, campaignId) {
    if (!tenantId || !campaignId) throw new Error('A tenant ID and campaign ID are required.');
    const files = [
      {
        name: 'campaign.json' as const,
        content: JSON.stringify({ campaignId }),
        sha256: 'abc123',
      },
    ];
    return {
      format: 'aegis.review-evidence.v1',
      tenantId,
      campaignId,
      exportedAt: new Date().toISOString(),
      files,
      manifestSha256: '07dfa1f211ddf708df25a3f76d6b56628087cdc2db849b6c4fe13e17f1a15e7b',
    };
  },
  async listCatalog() {
    return sampleCatalog;
  },
  async listDiscoveryQueue() {
    return sampleDiscoveryQueue;
  },
  async assignCatalogOwners(_tenantId, applicationId, owners) {
    const application = sampleCatalog.find((candidate) => candidate.id === applicationId);
    if (!application) throw new Error('The requested catalog application was not found.');
    return { ...application, owners, updatedAt: new Date().toISOString() };
  },
};

async function requestJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'content-type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!response.ok) throw new Error(`Aegis API request failed (${response.status}).`);
  return (await response.json()) as T;
}

export function createHttpApi(baseUrl: string): AegisApi {
  return {
    listIdentities: (tenantId, query) =>
      requestJson<readonly IdentitySummary[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/identities?query=${encodeURIComponent(query)}`,
      ),
    getFinding: async (tenantId, findingId) => {
      const response = await fetch(
        `${baseUrl}/v1/tenants/${encodeURIComponent(tenantId)}/findings/${encodeURIComponent(findingId)}`,
      );
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`Aegis API request failed (${response.status}).`);
      return (await response.json()) as FindingDetail;
    },
    listFindings: (tenantId) =>
      requestJson<readonly FindingListItem[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/findings`,
      ),
    submitReviewDecision: (tenantId, itemId, input) =>
      requestJson<RecordedReviewDecision>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/reviews/${encodeURIComponent(itemId)}/decisions`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    exportEvidence: (tenantId) => {
      if (!tenantId)
        return Promise.reject(new Error('A tenant ID is required for evidence export.'));
      return requestJson<EvidenceBundle>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/evidence/export`,
      );
    },
    listReviewCampaigns: (tenantId) =>
      requestJson<readonly ReviewCampaignSummary[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/review-campaigns`,
      ),
    listReviewPolicies: (tenantId) =>
      requestJson<readonly PolicyEvaluation[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/review-policies`,
      ),
    createPolicyReviewCampaign: (tenantId, input) =>
      requestJson<ReviewCampaignSummary>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/policy-review-campaigns`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    recordCampaignDecision: (tenantId, campaignId, taskId, input) =>
      requestJson<ReviewCampaignSummary>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/review-campaigns/${encodeURIComponent(campaignId)}/tasks/${encodeURIComponent(taskId)}/decisions`,
        { method: 'POST', body: JSON.stringify({ ...input, kind: input.decision }) },
      ),
    exportCampaignEvidence: (tenantId, campaignId) =>
      requestJson<CampaignEvidenceBundle>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/review-campaigns/${encodeURIComponent(campaignId)}/evidence/export`,
      ),
    listCatalog: (tenantId) =>
      requestJson<readonly CatalogApplication[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/apps`,
      ),
    listDiscoveryQueue: (tenantId) =>
      requestJson<readonly DiscoveryQueueItem[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/discovery-queue`,
      ),
    assignCatalogOwners: (tenantId, applicationId, owners) =>
      requestJson<CatalogApplication>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/apps/${encodeURIComponent(applicationId)}/owners`,
        { method: 'POST', body: JSON.stringify({ owners }) },
      ),
    listWorkflowTemplates: () =>
      requestJson<readonly WorkflowDefinition[]>(baseUrl, '/v1/workflow-templates'),
    dryRunWorkflow: (tenantId, input) =>
      requestJson<WorkflowExecution>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/workflows/dry-run`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    listActions: (tenantId) =>
      requestJson<readonly ControlledAction[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/actions`,
      ),
    listTestActivations: (tenantId) =>
      requestJson<readonly TestTenantActivationSummary[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/test-activations`,
      ),
    approveAction: (tenantId, actionId, input) =>
      requestJson<ControlledAction>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/actions/${encodeURIComponent(actionId)}/approve`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    executeAction: (tenantId, actionId, executor) =>
      requestJson<ControlledAction>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/actions/${encodeURIComponent(actionId)}/execute`,
        { method: 'POST', body: JSON.stringify({ executor }) },
      ),
    compensateAction: (tenantId, actionId, executor) =>
      requestJson<ControlledAction>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/actions/${encodeURIComponent(actionId)}/compensate`,
        { method: 'POST', body: JSON.stringify({ executor }) },
      ),
    requestOffboardingActions: (tenantId, executionId, input) =>
      requestJson<readonly ControlledAction[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/workflow-executions/${encodeURIComponent(executionId)}/offboarding-actions`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    listAccessRequests: (tenantId) =>
      requestJson<readonly AccessRequest[]>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/access-requests`,
      ),
    createAccessRequest: (tenantId, input) =>
      requestJson<AccessRequest>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/access-requests`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    decideAccessRequest: (tenantId, requestId, input) =>
      requestJson<AccessRequest>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/access-requests/${encodeURIComponent(requestId)}/decisions`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    activateAccessRequest: (tenantId, requestId) =>
      requestJson<AccessRequest>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/access-requests/${encodeURIComponent(requestId)}/activate`,
        { method: 'POST' },
      ),
  };
}

export const aegisApi = import.meta.env.VITE_AEGIS_API_URL
  ? createHttpApi(import.meta.env.VITE_AEGIS_API_URL)
  : demoApi;
