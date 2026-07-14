import type { ActionApproval, ActionExecution, ControlledAction } from '@aegis/action-contract';
import type { ActionRepository } from '@aegis/action-engine';
import type { Pool } from 'pg';

type ActionRow = { action: ControlledAction };

export class PostgresActionRepository implements ActionRepository {
  constructor(private readonly pool: Pool) {}

  async get(tenantId: string, actionId: string): Promise<ControlledAction | undefined> {
    const result = await this.pool.query<ActionRow>(
      `SELECT action FROM governance_controlled_actions WHERE tenant_id = $1 AND id = $2`,
      [tenantId, actionId],
    );
    return result.rows[0]?.action;
  }

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<ControlledAction | undefined> {
    const result = await this.pool.query<ActionRow>(
      `SELECT action FROM governance_controlled_actions WHERE tenant_id = $1 AND idempotency_key = $2`,
      [tenantId, idempotencyKey],
    );
    return result.rows[0]?.action;
  }

  async list(tenantId: string): Promise<readonly ControlledAction[]> {
    const result = await this.pool.query<ActionRow>(
      `SELECT action FROM governance_controlled_actions
       WHERE tenant_id = $1 ORDER BY requested_at DESC, id DESC`,
      [tenantId],
    );
    return result.rows.map((row) => row.action);
  }

  async createIfAbsent(action: ControlledAction): Promise<ControlledAction> {
    const inserted = await this.pool.query<ActionRow>(
      `INSERT INTO governance_controlled_actions (tenant_id, id, idempotency_key, requested_at, action)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
       RETURNING action`,
      [action.tenantId, action.id, action.idempotencyKey, action.requestedAt, action],
    );
    if (inserted.rows[0]) return inserted.rows[0].action;
    const existing = await this.findByIdempotencyKey(action.tenantId, action.idempotencyKey);
    if (!existing) throw new Error('Action idempotency record was not available after conflict');
    return existing;
  }

  async save(action: ControlledAction): Promise<void> {
    await this.pool.query(
      `INSERT INTO governance_controlled_actions (tenant_id, id, idempotency_key, requested_at, action)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, id) DO UPDATE SET action = EXCLUDED.action`,
      [action.tenantId, action.id, action.idempotencyKey, action.requestedAt, action],
    );
  }

  async recordApproval(tenantId: string, approval: ActionApproval): Promise<void> {
    await this.pool.query(
      `INSERT INTO governance_action_approvals (tenant_id, action_id, approved_at, approver, approval)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [tenantId, approval.actionId, approval.approvedAt, approval.approver, approval],
    );
  }

  async recordExecution(tenantId: string, execution: ActionExecution): Promise<void> {
    await this.pool.query(
      `INSERT INTO governance_action_executions
        (tenant_id, action_id, attempt, completed_at, status, execution)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, action_id, attempt) DO NOTHING`,
      [
        tenantId,
        execution.actionId,
        execution.attempt,
        execution.completedAt,
        execution.status,
        execution,
      ],
    );
  }
}
