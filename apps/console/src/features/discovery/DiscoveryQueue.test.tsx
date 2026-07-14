import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiscoveryQueue } from './DiscoveryQueue.js';

describe('DiscoveryQueue', () => {
  it('renders review reasons and a provider-safe recommendation', () => {
    render(
      <DiscoveryQueue
        loading={false}
        items={[
          {
            observation: {
              tenantId: 'acme',
              id: 'observation:1',
              source: 'idp',
              sourceReference: 'application/slack',
              vendorName: 'Slack',
              observedAt: '2026-07-14T00:00:00.000Z',
              activityCount: 0,
            },
            reasons: ['unknown_app', 'unused_license'],
            recommendation: 'monitor',
            usage: {
              tenantId: 'acme',
              observationId: 'observation:1',
              observedAt: '2026-07-14T00:00:00.000Z',
              activityCount: 0,
              source: 'idp',
            },
          },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Slack' })).toBeVisible();
    expect(screen.getByText('unknown app')).toBeVisible();
    expect(screen.getByText(/source systems are never changed/i)).toBeVisible();
  });
});
