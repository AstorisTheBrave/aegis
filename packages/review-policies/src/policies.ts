export type ReviewPolicyId = 'application-owner.v1' | 'non-human-identity.v1';
export type ReviewSubjectKind = 'application' | 'non_human_identity';

export interface ReviewPolicySubject {
  readonly id: string;
  readonly tenantId: string;
  readonly kind: ReviewSubjectKind;
  readonly displayName: string;
  readonly owners: readonly string[];
  readonly sourceReferences: readonly string[];
  readonly identityType?:
    'service_account' | 'bot' | 'oauth_application' | 'api_key' | 'integration';
}

export interface PolicyEvaluation {
  readonly policyId: ReviewPolicyId;
  readonly subject: ReviewPolicySubject;
  readonly recommendation: 'review_required' | 'monitor';
  readonly reasons: readonly ('missing_owner' | 'non_human_identity')[];
  readonly evidence: readonly { readonly sourceReference: string; readonly observedAt: string }[];
}

export function evaluateReviewPolicy(
  policyId: ReviewPolicyId,
  subject: ReviewPolicySubject,
  observedAt: string,
): PolicyEvaluation {
  const reasons = [
    ...(subject.owners.length ? [] : (['missing_owner'] as const)),
    ...(policyId === 'non-human-identity.v1' && subject.identityType
      ? (['non_human_identity'] as const)
      : []),
  ];
  return {
    policyId,
    subject,
    recommendation: reasons.length ? 'review_required' : 'monitor',
    reasons,
    evidence: subject.sourceReferences.map((sourceReference) => ({ sourceReference, observedAt })),
  };
}
