import { randomUUID } from 'node:crypto';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';
import {
  actionSchemaVersion,
  type ActionApproval,
  type ActionExecution,
  type ActionKind,
  type ActionPolicy,
  type ApproveActionInput,
  type ControlledAction,
  type CreateActionInput,
  type MockProviderId,
  validateCreateActionInput,
} from '@aegis/action-contract';

export interface ActionRepository {
  get(tenantId: string, actionId: string): Promise<ControlledAction | undefined>;
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<ControlledAction | undefined>;
  createIfAbsent(action: ControlledAction): Promise<ControlledAction>;
  list(tenantId: string): Promise<readonly ControlledAction[]>;
  save(action: ControlledAction): Promise<void>;
  recordApproval?(tenantId: string, approval: ActionApproval): Promise<void>;
  recordExecution?(tenantId: string, execution: ActionExecution): Promise<void>;
}

export interface CertifiedMockAdapter {
  readonly provider: MockProviderId;
  readonly certified: true;
  readonly mode: 'mock';
  readonly supportedKinds: readonly ActionKind[];
  execute(action: ControlledAction): Promise<{ receipt: string }>;
  compensate(action: ControlledAction): Promise<{ receipt: string }>;
}

export class InMemoryActionRepository implements ActionRepository {
  readonly #actions = new Map<string, ControlledAction>();

  async get(tenantId: string, actionId: string): Promise<ControlledAction | undefined> {
    return this.#actions.get(`${tenantId}:${actionId}`);
  }

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<ControlledAction | undefined> {
    return [...this.#actions.values()].find(
      (action) => action.tenantId === tenantId && action.idempotencyKey === idempotencyKey,
    );
  }

  async list(tenantId: string): Promise<readonly ControlledAction[]> {
    return [...this.#actions.values()]
      .filter((action) => action.tenantId === tenantId)
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
  }

  async createIfAbsent(action: ControlledAction): Promise<ControlledAction> {
    const existing = [...this.#actions.values()].find(
      (candidate) =>
        candidate.tenantId === action.tenantId &&
        candidate.idempotencyKey === action.idempotencyKey,
    );
    if (existing) return existing;
    this.#actions.set(`${action.tenantId}:${action.id}`, action);
    return action;
  }

  async save(action: ControlledAction): Promise<void> {
    this.#actions.set(`${action.tenantId}:${action.id}`, action);
  }
}

export class MockActionAdapter implements CertifiedMockAdapter {
  readonly certified = true as const;
  readonly mode = 'mock' as const;

  constructor(
    readonly provider: MockProviderId,
    readonly supportedKinds: readonly ActionKind[],
    private readonly shouldFail: (action: ControlledAction) => boolean = () => false,
  ) {}

  async execute(action: ControlledAction): Promise<{ receipt: string }> {
    if (this.shouldFail(action)) throw new Error(`Mock ${this.provider} provider failed`);
    return { receipt: `mock:${this.provider}:${action.id}:applied` };
  }

  async compensate(action: ControlledAction): Promise<{ receipt: string }> {
    return { receipt: `mock:${this.provider}:${action.id}:compensated` };
  }
}

export function createCertifiedMockAdapters(): readonly CertifiedMockAdapter[] {
  const allKinds: readonly ActionKind[] = [
    'disable_account',
    'revoke_sessions',
    'remove_group_membership',
  ];
  return [
    new MockActionAdapter('mock-github', ['remove_group_membership', 'revoke_sessions']),
    new MockActionAdapter('mock-okta', ['disable_account', 'revoke_sessions']),
    new MockActionAdapter('mock-google-workspace', allKinds),
  ];
}

export const defaultMockActionPolicies: readonly ActionPolicy[] = [
  {
    provider: 'mock-github',
    allowedKinds: ['remove_group_membership', 'revoke_sessions'],
    mode: 'mock',
  },
  { provider: 'mock-okta', allowedKinds: ['disable_account', 'revoke_sessions'], mode: 'mock' },
  {
    provider: 'mock-google-workspace',
    allowedKinds: ['disable_account', 'revoke_sessions', 'remove_group_membership'],
    mode: 'mock',
  },
];

export class ControlledActionEngine {
  readonly #adapters: ReadonlyMap<MockProviderId, CertifiedMockAdapter>;

  constructor(
    private readonly repository: ActionRepository,
    private readonly audit: AuditLedger,
    adapters: readonly CertifiedMockAdapter[] = createCertifiedMockAdapters(),
    private readonly policies: readonly ActionPolicy[] = defaultMockActionPolicies,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {
    this.#adapters = new Map(adapters.map((adapter) => [adapter.provider, adapter]));
  }

  async request(tenantId: string, input: CreateActionInput): Promise<ControlledAction> {
    const errors = validateCreateActionInput(input);
    if (errors.length) throw new Error(errors.join('; '));
    const requestedAt = this.now().toISOString();
    const action: ControlledAction = {
      schemaVersion: actionSchemaVersion,
      id: `action:${this.createId()}`,
      tenantId,
      ...(input.workflowExecutionId ? { workflowExecutionId: input.workflowExecutionId } : {}),
      provider: input.provider,
      kind: input.kind,
      target: input.target,
      requestedBy: input.requestedBy,
      requestedAt,
      requiredScopes: input.requiredScopes,
      idempotencyKey: input.idempotencyKey,
      rollbackNarrative: input.rollbackNarrative,
      maxAttempts: input.maxAttempts ?? 3,
      status: 'requested',
      approvals: [],
      executions: [],
      providerMutation: false,
    };
    const persisted = await this.repository.createIfAbsent(action);
    if (persisted.id !== action.id) return persisted;
    await this.audit.append({
      tenantId,
      occurredAt: requestedAt,
      actor: input.requestedBy,
      type: 'action.requested',
      correlationId: action.id,
      data: { action, providerMutation: false },
    });
    return action;
  }

  async approve(
    tenantId: string,
    actionId: string,
    input: ApproveActionInput,
  ): Promise<ControlledAction> {
    const action = await this.requireAction(tenantId, actionId);
    if (action.status !== 'requested') throw new Error('Only requested actions can be approved');
    if (!input.approver.trim() || !input.reason.trim())
      throw new Error('Approver and reason are required');
    const now = this.now();
    if (input.approver === action.requestedBy) {
      if (!input.breakGlass) throw new Error('Requester cannot approve their own action');
      const expiry = new Date(input.breakGlass.expiresAt);
      if (
        !input.breakGlass.reason.trim() ||
        Number.isNaN(expiry.valueOf()) ||
        expiry <= now ||
        expiry.valueOf() - now.valueOf() > 15 * 60 * 1000
      ) {
        throw new Error('Break-glass approval must have a reason and expire within 15 minutes');
      }
    } else if (input.breakGlass) {
      throw new Error('Break-glass is only available for a self-approval emergency');
    }
    const approval: ActionApproval = {
      actionId,
      approver: input.approver,
      reason: input.reason,
      approvedAt: now.toISOString(),
      ...(input.breakGlass ? { breakGlass: input.breakGlass } : {}),
    };
    const updated = {
      ...action,
      status: 'approved' as const,
      approvals: [...action.approvals, approval],
    };
    await this.repository.save(updated);
    await this.repository.recordApproval?.(tenantId, approval);
    await this.audit.append({
      tenantId,
      occurredAt: approval.approvedAt,
      actor: approval.approver,
      type: input.breakGlass ? 'action.break_glass_approved' : 'action.approved',
      correlationId: actionId,
      data: { approval, providerMutation: false },
    });
    return updated;
  }

  async execute(tenantId: string, actionId: string, executor: string): Promise<ControlledAction> {
    const action = await this.requireAction(tenantId, actionId);
    if (!['approved', 'failed'].includes(action.status))
      throw new Error('Action is not approved for execution');
    if (!executor.trim()) throw new Error('Executor is required');
    const approval = action.approvals.at(-1);
    if (!approval) throw new Error('Action approval is required');
    if (executor === action.requestedBy || executor === approval.approver) {
      throw new Error('Requester, approver, and executor must be distinct');
    }
    const policy = this.policies.find((candidate) => candidate.provider === action.provider);
    const adapter = this.#adapters.get(action.provider);
    if (!policy || policy.mode !== 'mock' || !policy.allowedKinds.includes(action.kind)) {
      throw new Error('Action is not allowlisted for mock execution');
    }
    if (
      !adapter ||
      adapter.certified !== true ||
      adapter.mode !== 'mock' ||
      !adapter.supportedKinds.includes(action.kind)
    ) {
      throw new Error('No certified mock adapter supports this action');
    }
    const attempt = action.executions.length + 1;
    if (attempt > action.maxAttempts) throw new Error('Action retry limit reached');
    const startedAt = this.now().toISOString();
    try {
      const result = await adapter.execute(action);
      const execution: ActionExecution = {
        actionId,
        attempt,
        executor,
        startedAt,
        completedAt: this.now().toISOString(),
        status: 'completed',
        providerReceipt: result.receipt,
      };
      const updated = {
        ...action,
        status: 'completed' as const,
        executions: [...action.executions, execution],
      };
      await this.repository.save(updated);
      await this.repository.recordExecution?.(tenantId, execution);
      await this.recordExecutionAudit(updated, execution);
      return updated;
    } catch (cause) {
      const execution: ActionExecution = {
        actionId,
        attempt,
        executor,
        startedAt,
        completedAt: this.now().toISOString(),
        status: 'failed',
        providerReceipt: `mock:${action.provider}:${action.id}:failed`,
        error: cause instanceof Error ? cause.message : 'Mock provider execution failed',
      };
      const updated = {
        ...action,
        status: 'failed' as const,
        executions: [...action.executions, execution],
      };
      await this.repository.save(updated);
      await this.repository.recordExecution?.(tenantId, execution);
      await this.recordExecutionAudit(updated, execution);
      return updated;
    }
  }

  async compensate(
    tenantId: string,
    actionId: string,
    executor: string,
  ): Promise<ControlledAction> {
    const action = await this.requireAction(tenantId, actionId);
    if (action.status !== 'completed') throw new Error('Only completed actions can be compensated');
    const adapter = this.#adapters.get(action.provider);
    if (!adapter || adapter.certified !== true || adapter.mode !== 'mock') {
      throw new Error('No certified mock adapter supports compensation');
    }
    const startedAt = this.now().toISOString();
    const result = await adapter.compensate(action);
    const execution: ActionExecution = {
      actionId,
      attempt: action.executions.length + 1,
      executor,
      startedAt,
      completedAt: this.now().toISOString(),
      status: 'compensated',
      providerReceipt: result.receipt,
    };
    const updated = {
      ...action,
      status: 'compensated' as const,
      executions: [...action.executions, execution],
    };
    await this.repository.save(updated);
    await this.repository.recordExecution?.(tenantId, execution);
    await this.recordExecutionAudit(updated, execution);
    return updated;
  }

  list(tenantId: string): Promise<readonly ControlledAction[]> {
    return this.repository.list(tenantId);
  }

  private async requireAction(tenantId: string, actionId: string): Promise<ControlledAction> {
    const action = await this.repository.get(tenantId, actionId);
    if (!action) throw new Error('Action not found');
    return action;
  }

  private async recordExecutionAudit(
    action: ControlledAction,
    execution: ActionExecution,
  ): Promise<void> {
    await this.audit.append({
      tenantId: action.tenantId,
      occurredAt: execution.completedAt,
      actor: execution.executor,
      type: `action.${execution.status}`,
      correlationId: action.id,
      data: { execution, providerMutation: false },
    });
  }
}
