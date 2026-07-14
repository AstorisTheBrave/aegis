import {
  validateWorkflowDefinition,
  workflowSchemaVersion,
  type WorkflowDefinition,
  type WorkflowTrigger,
} from '@aegis/workflow-contract';

function lifecycleTemplate(
  id: string,
  title: string,
  trigger: WorkflowTrigger,
  capability: string,
): WorkflowDefinition {
  return {
    schemaVersion: workflowSchemaVersion,
    id,
    version: '1.0.0',
    title,
    trigger,
    steps: [
      {
        id: 'owner-approval',
        kind: 'approval',
        title: 'Owner approval',
        approverRole: 'resource owner',
      },
      {
        id: 'simulate-provider-action',
        kind: 'provider_action',
        title: `Simulate ${capability}`,
        provider: 'target provider',
        capability,
        affectedSubject: 'source-linked subject',
        requiredScopes: ['governance.simulate'],
        idempotencyKey: `${id}:{{subject}}`,
        retry: { maxAttempts: 3, backoffSeconds: 60 },
        rollbackNarrative:
          'No provider action occurs; the future mutation would require approval and a compensation plan.',
        providerMutation: false,
      },
      { id: 'notify-owner', kind: 'notification', title: 'Notify owner', channel: 'email' },
    ],
  };
}

export const standardWorkflowTemplates: readonly WorkflowDefinition[] = [
  lifecycleTemplate(
    'new-starter.v1',
    'New starter',
    'hris',
    'provision account and baseline access',
  ),
  lifecycleTemplate(
    'contractor-expiry.v1',
    'Contractor expiry',
    'schedule',
    'revoke contractor access',
  ),
  lifecycleTemplate(
    'manager-change.v1',
    'Manager change',
    'hris',
    'reconcile reporting-line access',
  ),
  lifecycleTemplate('leaver.v1', 'Leaver', 'hris', 'disable account and remove access'),
  lifecycleTemplate(
    'saas-owner-departure.v1',
    'SaaS owner departure',
    'review_decision',
    'transfer application ownership',
  ),
  lifecycleTemplate(
    'new-shadow-app.v1',
    'New shadow app',
    'discovery',
    'route application ownership review',
  ),
  lifecycleTemplate(
    'stale-elevated-access.v1',
    'Stale elevated access',
    'policy_finding',
    'recommend elevated access removal',
  ),
];

export function getWorkflowTemplate(id: string): WorkflowDefinition | undefined {
  return standardWorkflowTemplates.find((template) => template.id === id);
}

export function validateStandardWorkflowTemplates(): readonly string[] {
  return standardWorkflowTemplates.flatMap((template) => validateWorkflowDefinition(template));
}
