import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DecisionControls } from '../features/reviews/DecisionControls.js';
import { IdentityTable } from '../features/inventory/IdentityTable.js';
import { demoApi } from '../lib/api.js';

describe('keyboard navigation', () => {
  it('keeps inventory controls and review controls reachable in sequence', async () => {
    const identities = await demoApi.listIdentities('acme-platform', 'Alice');
    render(
      <>
        <IdentityTable identities={identities} loading={false} onSelect={vi.fn()} />
        <DecisionControls onSubmit={vi.fn().mockResolvedValue(undefined)} />
      </>,
    );
    const details = screen.getByRole('button', { name: 'View details' });
    details.focus();
    expect(details).toHaveFocus();
    screen.getByRole('button', { name: /Maintain/i }).focus();
    expect(screen.getByRole('button', { name: /Maintain/i })).toHaveFocus();
    screen.getByRole('textbox', { name: 'Decision comment' }).focus();
    expect(screen.getByRole('textbox', { name: 'Decision comment' })).toHaveFocus();
    screen.getByRole('button', { name: 'Submit decision' }).focus();
    expect(screen.getByRole('button', { name: 'Submit decision' })).toHaveFocus();
  });
});
