import type {
  CampaignEvidenceBundle,
  EvidenceBundle,
  FindingDetail,
  IdentitySummary,
  RecordedReviewDecision,
  ReviewDecision,
  ReviewCampaignSummary,
} from '@aegis/api-contract';

export type {
  AccessStatus,
  CampaignEvidenceBundle,
  EvidenceBundle,
  FindingDetail,
  FindingEvidence,
  IdentitySummary,
  RecordedReviewDecision,
  ReviewDecision,
  ReviewCampaignSummary,
} from '@aegis/api-contract';

export interface AegisApi {
  listIdentities(tenantId: string, query: string): Promise<readonly IdentitySummary[]>;
  getFinding(tenantId: string, findingId: string): Promise<FindingDetail | undefined>;
  submitReviewDecision(
    tenantId: string,
    itemId: string,
    input: { decision: ReviewDecision; comment: string },
  ): Promise<RecordedReviewDecision>;
  exportEvidence(tenantId: string): Promise<EvidenceBundle>;
  listReviewCampaigns(tenantId: string): Promise<readonly ReviewCampaignSummary[]>;
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
}

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
    recordCampaignDecision: (tenantId, campaignId, taskId, input) =>
      requestJson<ReviewCampaignSummary>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/review-campaigns/${encodeURIComponent(campaignId)}/tasks/${encodeURIComponent(taskId)}/decisions`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    exportCampaignEvidence: (tenantId, campaignId) =>
      requestJson<CampaignEvidenceBundle>(
        baseUrl,
        `/v1/tenants/${encodeURIComponent(tenantId)}/review-campaigns/${encodeURIComponent(campaignId)}/evidence/export`,
      ),
  };
}

export const aegisApi = import.meta.env.VITE_AEGIS_API_URL
  ? createHttpApi(import.meta.env.VITE_AEGIS_API_URL)
  : demoApi;
