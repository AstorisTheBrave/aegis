import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DecisionControls } from './DecisionControls.js';

describe('DecisionControls', () => {
  it('records a revoke request without claiming provider mutation', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<DecisionControls onSubmit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    expect(screen.getByText(/does not change the provider/i)).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Decision comment' }), {
      target: { value: 'No longer needed.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit decision' }));
    await screen.findByText(/Decision recorded in Aegis/i);
    expect(submit).toHaveBeenCalledWith({
      decision: 'revocation_requested',
      comment: 'No longer needed.',
    });
  });
});
