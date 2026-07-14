import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { demoApi } from '../../lib/api.js';
import { IdentityTable } from './IdentityTable.js';

describe('IdentityTable', () => {
  it('renders review status and supports selecting a row by keyboard', async () => {
    const identities = await demoApi.listIdentities('acme-platform', 'Alice');
    const onSelect = vi.fn();
    render(
      <IdentityTable
        identities={identities}
        loading={false}
        onSelect={onSelect}
        selectedIdentityId=""
      />,
    );

    expect(screen.getByText('Requires review')).toBeVisible();
    const row = screen.getByText('Alice Example').closest('tr');
    if (!row) throw new Error('Expected identity table row.');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'alice-example' }));
  });

  it('can represent an empty filtered result', () => {
    render(<IdentityTable identities={[]} loading={false} onSelect={vi.fn()} />);
    expect(screen.getByText('No identities match this search.')).toBeVisible();
  });
});
