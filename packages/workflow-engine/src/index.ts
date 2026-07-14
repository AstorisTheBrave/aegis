import type { AuditLedger } from '@open-saas-governance/audit-ledger';
import { randomUUID } from 'node:crypto';
import {
  validateWorkflowDefinition,
  type DryRunWorkflowInput,
  type WorkflowDefinition,
  type WorkflowExecution,
  type WorkflowExecutionStatus,
  type WorkflowPreviewStep,
} from '@aegis/workflow-contract';

export interface WorkflowRepository {
  upsertDefinition(tenantId: string, definition: WorkflowDefinition): Promise<void>;
  listDefinitions(tenantId: string): Promise<readonly WorkflowDefinition[]>;
  recordExecution(execution: WorkflowExecution): Promise<void>;
  listExecutions(tenantId: string): Promise<readonly WorkflowExecution[]>;
}

export class InMemoryWorkflowRepository implements WorkflowRepository {
  readonly #definitions = new Map<string, WorkflowDefinition>();
  readonly #executions = new Map<string, WorkflowExecution[]>();

  async upsertDefinition(tenantId: string, definition: WorkflowDefinition): Promise<void> {
    this.#definitions.set(`${tenantId}:${definition.id}`, definition);
  }

  async listDefinitions(tenantId: string): Promise<readonly WorkflowDefinition[]> {
    return [...this.#definitions.entries()]
      .filter(([key]) => key.startsWith(`${tenantId}:`))
      .map(([, definition]) => definition)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  async recordExecution(execution: WorkflowExecution): Promise<void> {
    const current = this.#executions.get(execution.tenantId) ?? [];
    this.#executions.set(execution.tenantId, [execution, ...current]);
  }

  async listExecutions(tenantId: string): Promise<readonly WorkflowExecution[]> {
    return this.#executions.get(tenantId) ?? [];
  }
}

export class WorkflowDryRunEngine {
  constructor(
    private readonly repository: WorkflowRepository,
    private readonly audit: AuditLedger,
    private readonly now: () => Date = () => new Date(),
    private readonly createExecutionNonce: () => string = randomUUID,
  ) {}

  async preview(
    tenantId: string,
    definition: WorkflowDefinition,
    input: DryRunWorkflowInput,
  ): Promise<WorkflowExecution> {
    const errors = validateWorkflowDefinition(definition);
    if (errors.length) throw new Error(errors.join('; '));
    if (!input.sourceFacts.length) throw new Error('At least one source fact is required');
    const createdAt = this.now().toISOString();
    const failures = new Set(input.simulateFailureStepIds ?? []);
    const preview = definition.steps.map((step): WorkflowPreviewStep => {
      const failed = failures.has(step.id) && step.kind === 'provider_action';
      return {
        stepId: step.id,
        kind: step.kind,
        title: step.title,
        status: step.kind === 'approval' ? 'pending_approval' : failed ? 'dead_letter' : 'planned',
        requiredScopes: step.kind === 'provider_action' ? step.requiredScopes : [],
        ...(step.kind === 'provider_action' ? { rollbackNarrative: step.rollbackNarrative } : {}),
        ...(failed && step.kind === 'provider_action' ? { retry: step.retry } : {}),
        providerMutation: false,
      };
    });
    const status: WorkflowExecutionStatus = preview.some((step) => step.status === 'dead_letter')
      ? 'dead_letter'
      : preview.some((step) => step.status === 'pending_approval')
        ? 'requires_approval'
        : 'completed';
    const execution: WorkflowExecution = {
      id: `dry-run:${tenantId}:${definition.id}:${createdAt}:${this.createExecutionNonce()}`,
      tenantId,
      definitionId: definition.id,
      definitionVersion: definition.version,
      createdAt,
      actor: input.actor,
      status,
      sourceFacts: input.sourceFacts,
      preview,
      providerMutation: false,
    };
    await this.repository.upsertDefinition(tenantId, definition);
    await this.repository.recordExecution(execution);
    await this.audit.append({
      tenantId,
      occurredAt: createdAt,
      actor: input.actor,
      type: 'workflow.dry_run.recorded',
      correlationId: execution.id,
      data: {
        definitionId: definition.id,
        executionId: execution.id,
        sourceFacts: input.sourceFacts,
        preview,
        status,
        providerMutation: false,
      },
    });
    return execution;
  }
}
