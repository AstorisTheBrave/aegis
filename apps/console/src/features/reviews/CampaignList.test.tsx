import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CampaignList } from './CampaignList.js';

describe('CampaignList', () => {
  it('presents campaign routing without hiding unassigned work', () => {
    render(
      <CampaignList
        campaigns={[
          {
            id: 'campaign:1',
            title: 'GitHub elevated access review',
            createdAt: '2025-06-14T10:00:00.000Z',
            status: 'open',
            tasks: [
              {
                id: 'task:1',
                findingId: 'finding:1',
                findingTitle: 'Outside collaborator',
                severity: 'medium',
                route: 'unassigned',
                status: 'open',
                decisionCount: 0,
                decisions: [],
              },
            ],
          },
        ]}
        loading={false}
      />,
    );

    expect(screen.getByText('GitHub elevated access review')).toBeVisible();
    expect(screen.getByText(/Awaiting reviewer assignment/)).toBeVisible();
  });
});
