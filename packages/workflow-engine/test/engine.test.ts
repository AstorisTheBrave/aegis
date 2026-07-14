import { describe, expect, it } from 'vitest';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { getWorkflowTemplate } from '@aegis/workflow-templates';
import { InMemoryWorkflowRepository, WorkflowDryRunEngine } from '../src/index.js';

describe('WorkflowDryRunEngine', () => {
  it('creates an auditable provider-neutral approval preview', async () => {
    const audit = new InMemoryAuditLedger();
    const engine = new WorkflowDryRunEngine(
      new InMemoryWorkflowRepository(),
      audit,
      () => new Date('2026-07-14T18:00:00.000Z'),
    );
    const execution = await engine.preview('acme', getWorkflowTemplate('leaver.v1')!, {
      templateId: 'leaver.v1',
      actor: 'admin@acme.dev',
      sourceFacts: [
        {
          id: 'hris:1',
          kind: 'hris',
          label: 'Leaver event',
          observedAt: '2026-07-14T17:00:00.000Z',
        },
      ],
    });

    expect(execution).toMatchObject({ status: 'requires_approval', providerMutation: false });
    expect(execution.preview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'pending_approval' }),
        expect.objectContaining({
          requiredScopes: ['governance.simulate'],
          providerMutation: false,
        }),
      ]),
    );
    await expect(audit.list('acme')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'workflow.dry_run.recorded',
          data: expect.objectContaining({ providerMutation: false }),
        }),
      ]),
    );
  });

  it('models a simulated provider failure as a dead-letter outcome', async () => {
    const engine = new WorkflowDryRunEngine(
      new InMemoryWorkflowRepository(),
      new InMemoryAuditLedger(),
    );
    const execution = await engine.preview('acme', getWorkflowTemplate('leaver.v1')!, {
      templateId: 'leaver.v1',
      actor: 'admin@acme.dev',
      sourceFacts: [
        {
          id: 'hris:1',
          kind: 'hris',
          label: 'Leaver event',
          observedAt: '2026-07-14T17:00:00.000Z',
        },
      ],
      simulateFailureStepIds: ['simulate-provider-action'],
    });
    expect(execution).toMatchObject({ status: 'dead_letter', providerMutation: false });
    expect(execution.preview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: 'simulate-provider-action',
          status: 'dead_letter',
          retry: expect.objectContaining({ maxAttempts: 3 }),
        }),
      ]),
    );
  });

  it('generates distinct execution IDs for concurrent previews at the same instant', async () => {
    const repository = new InMemoryWorkflowRepository();
    let sequence = 0;
    const engine = new WorkflowDryRunEngine(
      repository,
      new InMemoryAuditLedger(),
      () => new Date('2026-07-14T18:00:00.000Z'),
      () => `nonce-${++sequence}`,
    );
    const definition = getWorkflowTemplate('leaver.v1')!;
    const input = {
      templateId: 'leaver.v1',
      actor: 'admin@acme.dev',
      sourceFacts: [
        {
          id: 'hris:1',
          kind: 'hris',
          label: 'Leaver event',
          observedAt: '2026-07-14T17:00:00.000Z',
        },
      ],
    };

    const [first, second] = await Promise.all([
      engine.preview('acme', definition, input),
      engine.preview('acme', definition, input),
    ]);

    expect(first.id).not.toBe(second.id);
    await expect(repository.listExecutions('acme')).resolves.toHaveLength(2);
  });
});
