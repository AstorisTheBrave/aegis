import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { demoApi } from '../../lib/api.js';
import { ExportEvidenceButton } from './ExportEvidenceButton.js';

describe('ExportEvidenceButton', () => {
  it('shows the evidence checksum after exporting', async () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:bundle'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ExportEvidenceButton api={demoApi} tenantId="acme-platform" />);
    fireEvent.click(screen.getByRole('button', { name: 'Export evidence' }));
    expect(await screen.findByText(/SHA-256:/)).toBeVisible();
  });

  it('does not request an export without a tenant', () => {
    const api = { ...demoApi, exportEvidence: vi.fn() };
    render(<ExportEvidenceButton api={api} tenantId="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Export evidence' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a tenant');
    expect(api.exportEvidence).not.toHaveBeenCalled();
  });
});
