import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell.js';

describe('AppShell', () => {
  it('renders the selected navigation, global search, and responsive controls', () => {
    const toggleNavigation = vi.fn();
    const toggleEvidence = vi.fn();
    render(
      <AppShell
        evidence={<p>Evidence</p>}
        evidenceOpen={false}
        navigationOpen={false}
        onEvidenceToggle={toggleEvidence}
        onNavigationToggle={toggleNavigation}
        onSearchChange={vi.fn()}
        search=""
      >
        <p>Workspace</p>
      </AppShell>,
    );

    expect(screen.getByRole('button', { name: 'Inventory' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('textbox', { name: 'Search identities, resources, roles' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show evidence' }));
    expect(toggleNavigation).toHaveBeenCalledOnce();
    expect(toggleEvidence).toHaveBeenCalledOnce();
  });
});
