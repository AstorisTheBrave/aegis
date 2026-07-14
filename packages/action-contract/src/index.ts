export const actionSchemaVersion = 'action.v2' as const;

export const supportedMockProviders = [
  'mock-github',
  'mock-okta',
  'mock-google-workspace',
] as const;
export type MockProviderId = (typeof supportedMockProviders)[number];

export const supportedActionKinds = [
  'disable_account',
  'revoke_sessions',
  'remove_group_membership',
] as const;
export type ActionKind = (typeof supportedActionKinds)[number];
export type ActionStatus =
  'requested' | 'approved' | 'executing' | 'completed' | 'failed' | 'compensated' | 'rejected';

export interface ActionTarget {
  readonly subjectId: string;
  readonly displayName: string;
}

export interface ActionPolicy {
  readonly provider: MockProviderId;
  readonly allowedKinds: readonly ActionKind[];
  readonly mode: 'mock' | 'disabled';
}

export interface ActionApproval {
  readonly actionId: string;
  readonly approver: string;
  readonly reason: string;
  readonly approvedAt: string;
  readonly breakGlass?: {
    readonly reason: string;
    readonly expiresAt: string;
  };
}

export interface ActionExecution {
  readonly actionId: string;
  readonly attempt: number;
  readonly executor: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly status: 'completed' | 'failed' | 'compensated';
  readonly providerReceipt: string;
  readonly error?: string;
}

export interface ControlledAction {
  readonly schemaVersion: typeof actionSchemaVersion;
  readonly id: string;
  readonly tenantId: string;
  readonly workflowExecutionId?: string;
  readonly provider: MockProviderId;
  readonly kind: ActionKind;
  readonly target: ActionTarget;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly requiredScopes: readonly string[];
  readonly idempotencyKey: string;
  readonly rollbackNarrative: string;
  readonly maxAttempts: number;
  readonly status: ActionStatus;
  readonly approvals: readonly ActionApproval[];
  readonly executions: readonly ActionExecution[];
  readonly providerMutation: false;
}

export interface CreateActionInput {
  readonly workflowExecutionId?: string;
  readonly provider: MockProviderId;
  readonly kind: ActionKind;
  readonly target: ActionTarget;
  readonly requestedBy: string;
  readonly requiredScopes: readonly string[];
  readonly idempotencyKey: string;
  readonly rollbackNarrative: string;
  readonly maxAttempts?: number;
  readonly simulateFailureOnce?: boolean;
}

export interface ApproveActionInput {
  readonly approver: string;
  readonly reason: string;
  readonly breakGlass?: {
    readonly reason: string;
    readonly expiresAt: string;
  };
}

export function validateCreateActionInput(input: CreateActionInput): readonly string[] {
  const errors: string[] = [];
  if (!supportedMockProviders.includes(input.provider)) errors.push('Unsupported mock provider');
  if (!supportedActionKinds.includes(input.kind)) errors.push('Unsupported action kind');
  if (!input.target.subjectId.trim() || !input.target.displayName.trim())
    errors.push('Target is required');
  if (!input.requestedBy.trim()) errors.push('Requester is required');
  if (!input.requiredScopes.length || input.requiredScopes.some((scope) => !scope.trim())) {
    errors.push('At least one required scope is required');
  }
  if (!input.idempotencyKey.trim()) errors.push('Idempotency key is required');
  if (!input.rollbackNarrative.trim()) errors.push('Rollback narrative is required');
  if (
    input.maxAttempts !== undefined &&
    (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1)
  ) {
    errors.push('Max attempts must be a positive integer');
  }
  return errors;
}
