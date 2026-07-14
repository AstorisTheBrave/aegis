export type AccessStatus = 'active' | 'requires_review' | 'suspended';

export interface IdentitySummary {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly source: string;
  readonly sourceAccount: string;
  readonly platform: string;
  readonly platformType: string;
  readonly status: AccessStatus;
  readonly privileged: boolean;
  readonly lastSeen: string;
}

export interface FindingEvidence {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly detail: string;
}

export interface FindingDetail {
  readonly id: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly title: string;
  readonly identity: string;
  readonly source: string;
  readonly resource: string;
  readonly access: string;
  readonly policy: string;
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly status: 'open' | 'resolved';
  readonly evidence: readonly FindingEvidence[];
}

export interface FindingListItem {
  readonly id: string;
  readonly type: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly title: string;
  readonly identity: string;
  readonly resource: string;
  readonly lastSeen: string;
  readonly status: 'open' | 'resolved';
}

export type ReviewDecision = 'approved' | 'needs_information' | 'revocation_requested';

export interface ReviewDecisionInput {
  readonly decision: ReviewDecision;
  readonly comment: string;
}

export interface RecordedReviewDecision extends ReviewDecisionInput {
  readonly itemId: string;
  readonly recordedAt: string;
}

export interface EvidenceBundle {
  readonly tenantId: string;
  readonly exportedAt: string;
  readonly records: readonly unknown[];
  readonly sha256: string;
}

export interface CampaignEvidenceFile {
  readonly name: 'campaign.json' | 'findings.json' | 'audit-ledger.json';
  readonly content: string;
  readonly sha256: string;
}

export interface CampaignEvidenceBundle {
  readonly format: 'aegis.review-evidence.v1';
  readonly tenantId: string;
  readonly exportedAt: string;
  readonly campaignId: string;
  readonly files: readonly CampaignEvidenceFile[];
  readonly manifestSha256: string;
}

export type CampaignDecision = 'retain' | 'remove_recommended' | 'delegate' | 'exception';

export interface ReviewCampaignDecision {
  readonly id: string;
  readonly kind: CampaignDecision;
  readonly reviewer: string;
  readonly rationale: string;
  readonly decidedAt: string;
}

export interface ReviewCampaignTask {
  readonly id: string;
  readonly findingId: string;
  readonly findingTitle: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly assignedReviewer?: string;
  readonly route: 'resource_owner' | 'fallback_reviewer' | 'unassigned' | 'delegated';
  readonly dueAt?: string;
  readonly status: 'open' | 'completed';
  readonly decisionCount: number;
  readonly decisions: readonly ReviewCampaignDecision[];
}

export interface ReviewCampaignSummary {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly dueAt?: string;
  readonly status: 'open' | 'complete';
  readonly tasks: readonly ReviewCampaignTask[];
}

export interface CreateReviewCampaignInput {
  readonly title: string;
  readonly findingIds?: readonly string[];
  readonly fallbackReviewer?: string;
  readonly dueAt?: string;
  readonly actor: string;
}

export interface RecordCampaignDecisionInput {
  readonly kind: CampaignDecision;
  readonly reviewer: string;
  readonly rationale: string;
  readonly delegatedTo?: string;
  readonly exceptionExpiresAt?: string;
}
