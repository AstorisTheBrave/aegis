import type {
  DryRunWorkflowInput,
  WorkflowDefinition,
  WorkflowExecution,
} from '@aegis/api-contract';
import { WorkflowDryRunEngine, type WorkflowRepository } from '@aegis/workflow-engine';
import { getWorkflowTemplate, standardWorkflowTemplates } from '@aegis/workflow-templates';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';

export class WorkflowManager {
  private readonly engine: WorkflowDryRunEngine;

  constructor(
    repository: WorkflowRepository,
    audit: AuditLedger,
    now: () => Date = () => new Date(),
  ) {
    this.engine = new WorkflowDryRunEngine(repository, audit, now);
    this.repository = repository;
  }

  private readonly repository: WorkflowRepository;

  listTemplates(): readonly WorkflowDefinition[] {
    return standardWorkflowTemplates;
  }

  listExecutions(tenantId: string): Promise<readonly WorkflowExecution[]> {
    return this.repository.listExecutions(tenantId);
  }

  async dryRun(tenantId: string, input: DryRunWorkflowInput): Promise<WorkflowExecution> {
    const template = getWorkflowTemplate(input.templateId);
    if (!template) throw new Error('Workflow template not found');
    return this.engine.preview(tenantId, template, input);
  }
}
