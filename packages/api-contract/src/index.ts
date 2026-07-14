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
