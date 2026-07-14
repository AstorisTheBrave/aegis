export const workflowSchemaVersion = 'workflow.v1' as const;

export type WorkflowTrigger =
  'hris' | 'idp' | 'discovery' | 'policy_finding' | 'review_decision' | 'schedule' | 'webhook';
export type WorkflowStepKind = 'approval' | 'human_task' | 'notification' | 'provider_action';
export type WorkflowExecutionStatus = 'completed' | 'requires_approval' | 'dead_letter';
export type WorkflowPreviewStatus =
  'planned' | 'pending_approval' | 'retry_scheduled' | 'dead_letter';

export interface WorkflowSourceFact {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly observedAt: string;
}

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoffSeconds: number;
}

export interface ApprovalStep {
  readonly id: string;
  readonly kind: 'approval';
  readonly title: string;
  readonly approverRole: string;
}

export interface HumanTaskStep {
  readonly id: string;
  readonly kind: 'human_task';
  readonly title: string;
  readonly assigneeRole: string;
}

export interface NotificationStep {
  readonly id: string;
  readonly kind: 'notification';
  readonly title: string;
  readonly channel: 'email' | 'webhook';
}

export interface ProviderActionStep {
  readonly id: string;
  readonly kind: 'provider_action';
  readonly title: string;
  readonly provider: string;
  readonly capability: string;
  readonly affectedSubject: string;
  readonly requiredScopes: readonly string[];
  readonly idempotencyKey: string;
  readonly retry: RetryPolicy;
  readonly rollbackNarrative: string;
  readonly providerMutation: false;
}

export type WorkflowStep = ApprovalStep | HumanTaskStep | NotificationStep | ProviderActionStep;

export interface WorkflowDefinition {
  readonly schemaVersion: typeof workflowSchemaVersion;
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly trigger: WorkflowTrigger;
  readonly steps: readonly WorkflowStep[];
}

export interface WorkflowPreviewStep {
  readonly stepId: string;
  readonly kind: WorkflowStepKind;
  readonly title: string;
  readonly status: WorkflowPreviewStatus;
  readonly requiredScopes: readonly string[];
  readonly rollbackNarrative?: string;
  readonly retry?: RetryPolicy;
  readonly providerMutation: false;
}

export interface WorkflowExecution {
  readonly id: string;
  readonly tenantId: string;
  readonly definitionId: string;
  readonly definitionVersion: string;
  readonly createdAt: string;
  readonly actor: string;
  readonly status: WorkflowExecutionStatus;
  readonly sourceFacts: readonly WorkflowSourceFact[];
  readonly preview: readonly WorkflowPreviewStep[];
  readonly providerMutation: false;
}

export interface DryRunWorkflowInput {
  readonly templateId: string;
  readonly actor: string;
  readonly sourceFacts: readonly WorkflowSourceFact[];
  readonly simulateFailureStepIds?: readonly string[];
}

export function validateWorkflowDefinition(definition: WorkflowDefinition): readonly string[] {
  const errors: string[] = [];
  if (definition.schemaVersion !== workflowSchemaVersion)
    errors.push('Unsupported workflow schema');
  if (!definition.id.trim() || !definition.version.trim() || !definition.title.trim()) {
    errors.push('Workflow identity is required');
  }
  if (!definition.steps.length) errors.push('A workflow requires at least one step');
  const ids = new Set<string>();
  for (const step of definition.steps) {
    if (!step.id.trim() || ids.has(step.id))
      errors.push(`Invalid or duplicate step ID: ${step.id}`);
    ids.add(step.id);
    if (step.kind === 'provider_action') {
      if (step.providerMutation !== false)
        errors.push(`Provider mutation is prohibited: ${step.id}`);
      if (!step.requiredScopes.length) errors.push(`Required scopes are missing: ${step.id}`);
      if (!step.rollbackNarrative.trim()) errors.push(`Rollback narrative is missing: ${step.id}`);
      if (step.retry.maxAttempts < 1 || step.retry.backoffSeconds < 0) {
        errors.push(`Retry policy is invalid: ${step.id}`);
      }
    }
  }
  return errors;
}
