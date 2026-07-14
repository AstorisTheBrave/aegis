import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkflowLibrary } from './WorkflowLibrary.js';

describe('WorkflowLibrary', () => {
  it('presents planned scopes and a provider-neutral failed preview', () => {
    render(
      <WorkflowLibrary
        loading={false}
        onRun={vi.fn().mockResolvedValue(undefined)}
        templates={[]}
        execution={{
          id: 'dry-run:1',
          tenantId: 'acme',
          definitionId: 'leaver.v1',
          definitionVersion: '1.0.0',
          createdAt: '2026-07-14T18:00:00.000Z',
          actor: 'admin',
          status: 'dead_letter',
          sourceFacts: [],
          providerMutation: false,
          preview: [
            {
              stepId: 'disable',
              kind: 'provider_action',
              title: 'Simulate disable',
              status: 'dead_letter',
              requiredScopes: ['governance.simulate'],
              rollbackNarrative: 'No write occurs.',
              retry: { maxAttempts: 3, backoffSeconds: 60 },
              providerMutation: false,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('Provider mutation: false')).toBeVisible();
    expect(screen.getByText(/governance.simulate/)).toBeVisible();
  });
});
