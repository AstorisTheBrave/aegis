import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { demoApi } from '../../lib/api.js';
import { FindingPanel } from './FindingPanel.js';

describe('FindingPanel', () => {
  it('shows high severity evidence records', async () => {
    render(<FindingPanel finding={await demoApi.getFinding('acme-platform', 'PRV-2025-00073')} />);
    expect(
      screen.getByRole('heading', { name: 'Privileged access requires review' }),
    ).toBeVisible();
    expect(screen.getByText('RoleBinding')).toBeVisible();
    expect(screen.getByText('ClusterRole')).toBeVisible();
    expect(screen.getByText('Maintain')).toBeVisible();
  });

  it('renders the access value supplied by the finding', async () => {
    const finding = await demoApi.getFinding('acme-platform', 'PRV-2025-00073');
    if (!finding) throw new Error('Expected the demo finding to exist');
    render(<FindingPanel finding={{ ...finding, access: 'Cluster administrator' }} />);
    expect(screen.getByText('Cluster administrator')).toBeVisible();
  });

  it('explains the no-finding state', () => {
    render(<FindingPanel />);
    expect(screen.getByText(/Select an identity with an open finding/i)).toBeVisible();
  });
});
