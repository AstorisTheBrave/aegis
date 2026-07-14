import { createHash } from 'node:crypto';
import type {
  ActionApproval,
  ActionExecution,
  ApproveActionInput,
  ControlledAction,
  CreateActionInput,
} from '@aegis/api-contract';
import { ControlledActionEngine, type ActionRepository } from '@aegis/action-engine';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';

export interface ActionEvidenceBundle {
  readonly format: 'aegis.action-evidence.v1';
  readonly tenantId: string;
  readonly exportedAt: string;
  readonly actions: readonly ControlledAction[];
  readonly sha256: string;
}

export interface OffboardingActionInput {
  readonly target: CreateActionInput['target'];
  readonly requestedBy: string;
}

export class ActionManager {
  private readonly engine: ControlledActionEngine;

  constructor(
    repository: ActionRepository,
    audit: AuditLedger,
    now: () => Date = () => new Date(),
  ) {
    this.engine = new ControlledActionEngine(repository, audit, undefined, undefined, now);
  }

  list(tenantId: string): Promise<readonly ControlledAction[]> {
    return this.engine.list(tenantId);
  }

  request(tenantId: string, input: CreateActionInput): Promise<ControlledAction> {
    return this.engine.request(tenantId, input);
  }

  approve(
    tenantId: string,
    actionId: string,
    input: ApproveActionInput,
  ): Promise<ControlledAction> {
    return this.engine.approve(tenantId, actionId, input);
  }

  execute(tenantId: string, actionId: string, executor: string): Promise<ControlledAction> {
    return this.engine.execute(tenantId, actionId, executor);
  }

  compensate(tenantId: string, actionId: string, executor: string): Promise<ControlledAction> {
    return this.engine.compensate(tenantId, actionId, executor);
  }

  async requestOffboarding(
    tenantId: string,
    workflowExecutionId: string,
    input: OffboardingActionInput,
  ): Promise<readonly ControlledAction[]> {
    const templates: readonly Omit<CreateActionInput, 'target' | 'requestedBy'>[] = [
      {
        workflowExecutionId,
        provider: 'mock-okta',
        kind: 'disable_account',
        requiredScopes: ['users.disable'],
        idempotencyKey: `${workflowExecutionId}:mock-okta:disable-account`,
        rollbackNarrative: 'Re-enable the mock IdP account and restore session policy.',
      },
      {
        workflowExecutionId,
        provider: 'mock-google-workspace',
        kind: 'revoke_sessions',
        requiredScopes: ['sessions.revoke'],
        idempotencyKey: `${workflowExecutionId}:mock-google-workspace:revoke-sessions`,
        rollbackNarrative: 'Restore mock session access after validating the incident is cleared.',
      },
      {
        workflowExecutionId,
        provider: 'mock-github',
        kind: 'remove_group_membership',
        requiredScopes: ['org.members.write'],
        idempotencyKey: `${workflowExecutionId}:mock-github:remove-membership`,
        rollbackNarrative: 'Restore the mock organization membership from the action evidence.',
      },
    ];
    return Promise.all(
      templates.map((template) => this.request(tenantId, { ...template, ...input })),
    );
  }

  async exportEvidence(tenantId: string): Promise<ActionEvidenceBundle> {
    const actions = await this.list(tenantId);
    const exportedAt = new Date().toISOString();
    const payload = JSON.stringify({ tenantId, exportedAt, actions });
    return {
      format: 'aegis.action-evidence.v1',
      tenantId,
      exportedAt,
      actions,
      sha256: createHash('sha256').update(payload).digest('hex'),
    };
  }
}
