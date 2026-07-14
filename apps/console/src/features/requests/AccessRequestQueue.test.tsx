import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccessRequestQueue } from './AccessRequestQueue.js';

const request = {
  schemaVersion: 'access-request.v1' as const,
  id: 'access-request:1',
  tenantId: 'acme',
  catalogItem: {
    id: 'github-maintain',
    title: 'GitHub maintain access',
    provider: 'mock-github',
    entitlement: 'maintain',
    reviewer: 'owner@acme.dev',
    maxDurationMinutes: 240,
  },
  requester: 'user@acme.dev',
  rationale: 'Incident investigation',
  durationMinutes: 60,
  requestedAt: '2026-07-14T20:00:00.000Z',
  status: 'pending' as const,
  idempotencyKey: 'request:1',
  simulatedFulfillment: {
    requiresControlledAction: true as const,
    providerMutation: false as const,
  },
};

describe('AccessRequestQueue', () => {
  it('shows the non-mutating fulfillment boundary and routes approval controls', () => {
    const onDecide = vi.fn(async () => undefined);
    render(
      <AccessRequestQueue
        loading={false}
        onActivate={async () => undefined}
        onDecide={onDecide}
        onRequest={async () => undefined}
        requests={[request]}
      />,
    );
    expect(screen.getByText(/Controlled action required/)).toHaveTextContent(
      'provider mutation: false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onDecide).toHaveBeenCalledWith(request, true);
  });
});
