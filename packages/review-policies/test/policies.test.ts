import { describe, expect, it } from 'vitest';
import { evaluateReviewPolicy } from '../src/index.js';

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
});
