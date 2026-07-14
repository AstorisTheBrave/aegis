import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssistancePanel } from './AssistancePanel.js';

const settings = {
  schemaVersion: 'assistance.v1' as const,
  tenantId: 'acme',
  enabled: true,
  allowedProviders: ['aegis-deterministic-local.v1'],
  budgetPerRequest: 400,
  updatedAt: '2026-07-14T20:00:00.000Z',
  updatedBy: 'admin@acme.dev',
};

describe('AssistancePanel', () => {
  it('keeps generated drafts grounded and without provider authority', () => {
    const onGenerate = vi.fn(async () => undefined);
    render(
      <AssistancePanel
        loading={false}
        onEnable={async () => undefined}
        onGenerate={onGenerate}
        output={{
          schemaVersion: 'assistance.v1',
          id: 'assistance:1',
          tenantId: 'acme',
          kind: 'evidence_summary',
          providerId: 'aegis-deterministic-local.v1',
          promptVersion: 'console-evidence-summary.v1',
          createdAt: '2026-07-14T20:00:00.000Z',
          sourceFacts: [
            {
              id: 'inventory:current',
              label: 'Current access inventory',
              observedAt: '2026-07-14T20:00:00.000Z',
            },
          ],
          narrative: 'Grounded summary.',
          redactionCount: 0,
          budgetUsed: 5,
          providerMutation: false,
          enforcement: 'not_authorized',
        }}
        settings={settings}
      />,
    );
    expect(screen.getByText(/Provider mutation/)).toHaveTextContent('false');
    expect(screen.getByText('Current access inventory')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generate evidence summary' }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });
});
