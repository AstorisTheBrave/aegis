import type { DiscoveryObservation, DiscoveryQueueItem } from '@aegis/discovery';
import type { CatalogApplication, CatalogOwner } from '@aegis/saas-catalog';
import type { PolicyEvaluation, ReviewPolicyId } from '@aegis/review-policies';
import type {
  DryRunWorkflowInput,
  WorkflowDefinition,
  WorkflowExecution,
} from '@aegis/workflow-contract';
import type {
  ActionApproval,
  ActionExecution,
  ApproveActionInput,
  ControlledAction,
  CreateActionInput,
} from '@aegis/action-contract';

export type { CatalogApplication, CatalogOwner, DiscoveryObservation, DiscoveryQueueItem };
export type { PolicyEvaluation };
export type { DryRunWorkflowInput, WorkflowDefinition, WorkflowExecution };
export type {
  ActionApproval,
  ActionExecution,
  ApproveActionInput,
  ControlledAction,
  CreateActionInput,
};

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
  readonly policy?: ReviewCampaignTaskPolicy;
  readonly severity: 'low' | 'medium' | 'high';
  readonly assignedReviewer?: string;
  readonly route: 'resource_owner' | 'fallback_reviewer' | 'unassigned' | 'delegated';
  readonly dueAt?: string;
  readonly status: 'open' | 'completed';
  readonly decisionCount: number;
  readonly decisions: readonly ReviewCampaignDecision[];
}

export interface ReviewCampaignTaskPolicy {
  readonly policyId: ReviewPolicyId;
  readonly subjectId: string;
  readonly subjectKind: 'application' | 'non_human_identity';
  readonly displayName: string;
  readonly evidence: readonly { readonly sourceReference: string; readonly observedAt: string }[];
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

export interface CreatePolicyReviewCampaignInput {
  readonly title: string;
  readonly policyIds?: readonly ReviewPolicyId[];
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

export interface CreateCatalogApplicationInput {
  readonly id: string;
  readonly vendorName: string;
  readonly normalizedName?: string;
  readonly domains: readonly string[];
  readonly aliases: readonly string[];
  readonly category: string;
  readonly riskTier: CatalogApplication['riskTier'];
  readonly dataClassification: CatalogApplication['dataClassification'];
  readonly recommendation: CatalogApplication['recommendation'];
  readonly owners?: readonly CatalogOwner[];
  readonly approvedAlternatives?: readonly string[];
  readonly renewalAt?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface AssignCatalogOwnersInput {
  readonly owners: readonly CatalogOwner[];
  readonly updatedAt?: string;
}

export interface RecordDiscoveryObservationInput {
  readonly id: string;
  readonly source: DiscoveryObservation['source'];
  readonly sourceReference: string;
  readonly vendorName: string;
  readonly domain?: string;
  readonly observedAt: string;
  readonly activityCount: number;
  readonly identityType?: DiscoveryObservation['identityType'];
  readonly metadata?: DiscoveryObservation['metadata'];
}
