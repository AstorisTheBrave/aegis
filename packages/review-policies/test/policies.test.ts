import { describe, expect, it } from 'vitest';
import { evaluateReviewPolicy, policyEvaluationFinding } from '../src/index.js';

describe('review policies', () => {
  it('emits source-linked review evidence for an ownerless non-human identity', () => {
    expect(
      evaluateReviewPolicy(
        'non-human-identity.v1',
        {
          id: 'oauth:slack',
          tenantId: 'acme',
          kind: 'non_human_identity',
          displayName: 'Slack OAuth',
          owners: [],
          sourceReferences: ['idp/application/slack'],
          identityType: 'oauth_application',
        },
        '2026-07-14T16:00:00.000Z',
      ),
    ).toMatchObject({
      recommendation: 'review_required',
      reasons: ['missing_owner', 'non_human_identity'],
      evidence: [{ sourceReference: 'idp/application/slack' }],
    });
  });

  it('preserves source timestamps in the review task evidence', () => {
    const evaluation = evaluateReviewPolicy(
      'application-owner.v1',
      {
        id: 'design-tool',
        tenantId: 'acme',
        kind: 'application',
        displayName: 'Design Tool',
        owners: [],
        sourceReferences: ['design tool'],
        sourceEvidence: [
          { sourceReference: 'design tool', observedAt: '2026-06-01T00:00:00.000Z' },
        ],
      },
      '2026-07-14T16:00:00.000Z',
    );

    expect(policyEvaluationFinding(evaluation)).toMatchObject({
      type: 'POLICY_REVIEW',
      subject: { resourceId: 'design-tool' },
      sourceFacts: [{ observedAt: '2026-06-01T00:00:00.000Z' }],
    });
  });
});
