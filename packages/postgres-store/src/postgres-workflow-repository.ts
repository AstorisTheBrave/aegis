import type { WorkflowDefinition, WorkflowExecution } from '@aegis/workflow-contract';
import type { WorkflowRepository } from '@aegis/workflow-engine';
import type { Pool } from 'pg';

type DefinitionRow = { definition: WorkflowDefinition };
type ExecutionRow = { execution: WorkflowExecution };

export class PostgresWorkflowRepository implements WorkflowRepository {
  constructor(private readonly pool: Pool) {}

  async upsertDefinition(tenantId: string, definition: WorkflowDefinition): Promise<void> {
    await this.pool.query(
      `INSERT INTO governance_workflow_definitions
        (tenant_id, id, version, title, definition, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (tenant_id, id) DO UPDATE
         SET version = EXCLUDED.version,
             title = EXCLUDED.title,
             definition = EXCLUDED.definition,
             updated_at = EXCLUDED.updated_at`,
      [tenantId, definition.id, definition.version, definition.title, definition],
    );
  }

  async listDefinitions(tenantId: string): Promise<readonly WorkflowDefinition[]> {
    const result = await this.pool.query<DefinitionRow>(
      `SELECT definition FROM governance_workflow_definitions
        WHERE tenant_id = $1 ORDER BY id`,
      [tenantId],
    );
    return result.rows.map((row) => row.definition);
  }

  async recordExecution(execution: WorkflowExecution): Promise<void> {
    await this.pool.query(
      `INSERT INTO governance_workflow_executions
        (tenant_id, id, definition_id, execution, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [execution.tenantId, execution.id, execution.definitionId, execution, execution.createdAt],
    );
  }

  async listExecutions(tenantId: string): Promise<readonly WorkflowExecution[]> {
    const result = await this.pool.query<ExecutionRow>(
      `SELECT execution FROM governance_workflow_executions
        WHERE tenant_id = $1 ORDER BY created_at DESC, id DESC`,
      [tenantId],
    );
    return result.rows.map((row) => row.execution);
  }
}
