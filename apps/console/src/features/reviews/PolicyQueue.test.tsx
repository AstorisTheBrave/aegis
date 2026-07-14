import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PolicyQueue } from './PolicyQueue.js';

describe('PolicyQueue', () => {
  it('shows source evidence for application and non-human identity recommendations', () => {
    render(
      <PolicyQueue
        evaluations={[
          {
            policyId: 'application-owner.v1',
            subject: {
              id: 'slack',
              tenantId: 'acme',
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
              id: 'bot:1',
              tenantId: 'acme',
              kind: 'non_human_identity',
              displayName: 'Build bot',
              owners: [],
              sourceReferences: ['idp/bot'],
              identityType: 'bot',
            },
            recommendation: 'review_required',
            reasons: ['missing_owner', 'non_human_identity'],
            evidence: [{ sourceReference: 'idp/bot', observedAt: '2026-07-14T01:00:00.000Z' }],
          },
        ]}
        loading={false}
        onRunReview={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Slack')).toBeVisible();
    expect(screen.getByText('Build bot')).toBeVisible();
    expect(screen.getByText('idp/bot')).toBeVisible();
  });
});
