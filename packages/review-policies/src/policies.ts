import type { Finding, FindingSourceFact } from '@aegis/findings';

export type ReviewPolicyId = 'application-owner.v1' | 'non-human-identity.v1';
export type ReviewSubjectKind = 'application' | 'non_human_identity';

export interface ReviewPolicyEvidenceReference {
  readonly sourceReference: string;
  readonly observedAt: string;
}

export interface ReviewPolicySubject {
  readonly id: string;
  readonly tenantId: string;
  readonly kind: ReviewSubjectKind;
  readonly displayName: string;
  readonly owners: readonly string[];
  readonly sourceReferences: readonly string[];
  readonly sourceEvidence?: readonly ReviewPolicyEvidenceReference[];
  readonly identityType?:
    'service_account' | 'bot' | 'oauth_application' | 'api_key' | 'integration';
}

export interface PolicyEvaluation {
  readonly policyId: ReviewPolicyId;
  readonly subject: ReviewPolicySubject;
  readonly recommendation: 'review_required' | 'monitor';
  readonly reasons: readonly ('missing_owner' | 'non_human_identity')[];
  readonly evidence: readonly ReviewPolicyEvidenceReference[];
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
    evidence:
      subject.sourceEvidence ??
      subject.sourceReferences.map((sourceReference) => ({ sourceReference, observedAt })),
  };
}

export function policyEvaluationFinding(evaluation: PolicyEvaluation): Finding {
  const policy = policyContext(evaluation);
  return {
    id: `policy:${evaluation.policyId}:${evaluation.subject.kind}:${evaluation.subject.id}`,
    type: 'POLICY_REVIEW',
    severity: evaluation.reasons.includes('missing_owner') ? 'high' : 'medium',
    ruleId: evaluation.policyId,
    title:
      evaluation.subject.kind === 'application'
        ? `Application owner review: ${evaluation.subject.displayName}`
        : `Non-human identity review: ${evaluation.subject.displayName}`,
    evidence: {
      policyId: policy.policyId,
      subjectId: policy.subjectId,
      subjectKind: policy.subjectKind,
      sourceEvidence: JSON.stringify(policy.evidence),
      reasons: JSON.stringify(evaluation.reasons),
      providerMutation: 'false',
    },
    sourceFacts: evaluation.evidence.map((evidence) => sourceFact(evaluation, evidence)),
    subject: {
      resourceId: policy.subjectId,
      ...(evaluation.subject.kind === 'non_human_identity' ? { identityId: policy.subjectId } : {}),
    },
  };
}

export function policyContext(evaluation: PolicyEvaluation): {
  readonly policyId: ReviewPolicyId;
  readonly subjectId: string;
  readonly subjectKind: ReviewSubjectKind;
  readonly displayName: string;
  readonly evidence: readonly ReviewPolicyEvidenceReference[];
} {
  return {
    policyId: evaluation.policyId,
    subjectId: evaluation.subject.id,
    subjectKind: evaluation.subject.kind,
    displayName: evaluation.subject.displayName,
    evidence: evaluation.evidence,
  };
}

function sourceFact(
  evaluation: PolicyEvaluation,
  evidence: ReviewPolicyEvidenceReference,
): FindingSourceFact {
  return {
    kind: evaluation.subject.kind === 'application' ? 'resource' : 'identity',
    id: evidence.sourceReference,
    observedAt: evidence.observedAt,
    label: evaluation.subject.displayName,
  };
}
