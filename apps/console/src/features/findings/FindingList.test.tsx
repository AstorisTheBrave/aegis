import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FindingList } from './FindingList.js';

describe('FindingList', () => {
  it('selects a finding from the workspace view', () => {
    const onSelect = vi.fn();
    render(
      <FindingList
        findings={[
          {
            id: 'finding:1',
            identity: 'Alice',
            lastSeen: 'now',
            resource: 'platform',
            severity: 'high',
            status: 'open',
            title: 'Privileged access',
            type: 'PRIVILEGED_ACCESS',
          },
        ]}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Privileged access/i }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'finding:1' }));
  });
});
