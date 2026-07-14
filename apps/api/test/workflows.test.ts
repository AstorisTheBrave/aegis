import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { InMemoryWorkflowRepository } from '@aegis/workflow-engine';
import { createApp } from '../src/app.js';
import { WorkflowManager } from '../src/workflows.js';

describe('workflow dry-run API', () => {
  it('previews a template with source evidence and never enables provider mutation', async () => {
    const app = createApp(new InMemoryAccessGraphRepository(), {
      workflows: new WorkflowManager(
        new InMemoryWorkflowRepository(),
        new InMemoryAuditLedger(),
        () => new Date('2026-07-14T18:00:00.000Z'),
      ),
    });
    expect((await app.inject('/v1/workflow-templates')).json()).toHaveLength(7);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/workflows/dry-run',
      payload: {
        templateId: 'leaver.v1',
        actor: 'admin@acme.dev',
        sourceFacts: [
          {
            id: 'hris:leaver:1',
            kind: 'hris',
            label: 'Leaver',
            observedAt: '2026-07-14T17:00:00.000Z',
          },
        ],
        simulateFailureStepIds: ['simulate-provider-action'],
      },
    });
    expect(response.statusCode).toBe(200);
    const execution = response.json();
    expect(execution).toMatchObject({ status: 'dead_letter', providerMutation: false });
    expect(execution.preview).toEqual(
      expect.arrayContaining([expect.objectContaining({ providerMutation: false })]),
    );
    expect((await app.inject('/v1/tenants/acme/workflow-executions')).json()).toHaveLength(1);
    await app.close();
  });

  it('rejects malformed workflow preview input', async () => {
    const app = createApp(new InMemoryAccessGraphRepository());
    expect(
      (await app.inject({ method: 'POST', url: '/v1/tenants/acme/workflows/dry-run', payload: {} }))
        .statusCode,
    ).toBe(400);
    await app.close();
  });
});
