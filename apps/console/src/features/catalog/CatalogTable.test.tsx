import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CatalogTable } from './CatalogTable.js';

describe('CatalogTable', () => {
  it('shows ownership and governance posture', () => {
    render(
      <CatalogTable
        loading={false}
        applications={[
          {
            tenantId: 'acme',
            id: 'slack',
            vendorName: 'Slack',
            normalizedName: 'slack',
            domains: ['slack.com'],
            aliases: [],
            category: 'Collaboration',
            riskTier: 'high',
            dataClassification: 'confidential',
            recommendation: 'monitor',
            owners: [],
            approvedAlternatives: [],
            createdAt: '2026-07-14T00:00:00.000Z',
            updatedAt: '2026-07-14T00:00:00.000Z',
          },
        ]}
      />,
    );
    expect(screen.getByRole('cell', { name: 'Slackslack.com' })).toBeVisible();
    expect(screen.getByText('Unassigned')).toBeVisible();
  });

  it('assigns an owner only to the Aegis catalog record', () => {
    const assignOwners = vi.fn().mockResolvedValue(undefined);
    render(
      <CatalogTable
        loading={false}
        onAssignOwners={assignOwners}
        applications={[
          {
            tenantId: 'acme',
            id: 'slack',
            vendorName: 'Slack',
            normalizedName: 'slack',
            domains: ['slack.com'],
            aliases: [],
            category: 'Collaboration',
            riskTier: 'high',
            dataClassification: 'confidential',
            recommendation: 'monitor',
            owners: [],
            approvedAlternatives: [],
            createdAt: '2026-07-14T00:00:00.000Z',
            updatedAt: '2026-07-14T00:00:00.000Z',
          },
        ]}
      />,
    );
    fireEvent.change(screen.getByLabelText('Owner identity for Slack'), {
      target: { value: 'alice-example' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    expect(assignOwners).toHaveBeenCalledWith(
      'slack',
      expect.arrayContaining([expect.objectContaining({ identityId: 'alice-example' })]),
    );
  });
});
