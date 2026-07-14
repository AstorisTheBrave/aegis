import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { InMemoryActionRepository } from '@aegis/action-engine';
import { InMemoryWorkflowRepository } from '@aegis/workflow-engine';
import { ActionManager } from '../src/actions.js';
import { createApp } from '../src/app.js';
import { WorkflowManager } from '../src/workflows.js';

describe('controlled action API', () => {
  it('rejects self-approval and executes only approved mock actions with evidence', async () => {
    const app = createApp(new InMemoryAccessGraphRepository(), {
      actions: new ActionManager(new InMemoryActionRepository(), new InMemoryAuditLedger()),
    });
    const requested = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/actions',
      payload: {
        provider: 'mock-okta',
        kind: 'disable_account',
        target: { subjectId: 'person:alice', displayName: 'Alice Example' },
        requestedBy: 'requester@acme.dev',
        requiredScopes: ['users.disable'],
        idempotencyKey: 'leaver:alice:okta',
        rollbackNarrative: 'Restore the mock account.',
      },
    });
    expect(requested.statusCode).toBe(200);
    const actionId = (requested.json() as { id: string }).id;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/tenants/acme/actions/${actionId}/approve`,
          payload: { approver: 'requester@acme.dev', reason: 'No.' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/tenants/acme/actions/${actionId}/approve`,
          payload: { approver: 'approver@acme.dev', reason: 'HRIS event verified.' },
        })
      ).json(),
    ).toMatchObject({ status: 'approved' });
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/tenants/acme/actions/${actionId}/execute`,
          payload: { executor: 'executor@acme.dev' },
        })
      ).json(),
    ).toMatchObject({ status: 'completed', providerMutation: false });
    expect((await app.inject('/v1/tenants/acme/actions/evidence/export')).json()).toMatchObject({
      format: 'aegis.action-evidence.v1',
      actions: [expect.objectContaining({ status: 'completed' })],
    });
    await app.close();
  });

  it('creates three idempotent mock offboarding actions for a known dry-run execution', async () => {
    const audit = new InMemoryAuditLedger();
    const workflows = new WorkflowManager(new InMemoryWorkflowRepository(), audit);
    const execution = await workflows.dryRun('acme', {
      templateId: 'leaver.v1',
      actor: 'requester@acme.dev',
      sourceFacts: [
        {
          id: 'hris:alice',
          kind: 'hris',
          label: 'Leaver event',
          observedAt: '2026-07-14T18:00:00.000Z',
        },
      ],
    });
    const app = createApp(new InMemoryAccessGraphRepository(), {
      workflows,
      actions: new ActionManager(new InMemoryActionRepository(), audit),
    });
    const path = `/v1/tenants/acme/workflow-executions/${encodeURIComponent(execution.id)}/offboarding-actions`;
    const payload = {
      target: { subjectId: 'person:alice', displayName: 'Alice Example' },
      requestedBy: 'requester@acme.dev',
    };
    const first = await app.inject({ method: 'POST', url: path, payload });
    const duplicate = await app.inject({ method: 'POST', url: path, payload });
    expect(first.json()).toHaveLength(3);
    expect(duplicate.json()).toMatchObject(first.json());
    await app.close();
  });
});
