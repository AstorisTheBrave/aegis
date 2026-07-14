import type {
  ReviewCampaign,
  ReviewCampaignRepository,
  ReviewDecisionRecord,
  ReviewRoute,
  ReviewTask,
  ReviewTaskPolicy,
  ReviewTaskStatus,
} from '@aegis/reviews';
import type { Finding } from '@aegis/findings';
import type { Pool, PoolClient } from 'pg';

type CampaignRow = {
  tenant_id: string;
  id: string;
  title: string;
  created_at: Date;
  due_at: Date | null;
};
type TaskRow = {
  tenant_id: string;
  id: string;
  campaign_id: string;
  finding: Finding;
  policy: ReviewTaskPolicy | null;
  resource_id: string | null;
  assigned_reviewer: string | null;
  route: ReviewRoute;
  due_at: Date | null;
  status: ReviewTaskStatus;
};
type DecisionRow = {
  tenant_id: string;
  id: string;
  task_id: string;
  kind: ReviewDecisionRecord['kind'];
  reviewer: string;
  rationale: string;
  delegated_to: string | null;
  exception_expires_at: Date | null;
  decided_at: Date;
};

export class PostgresReviewCampaignRepository implements ReviewCampaignRepository {
  constructor(private readonly pool: Pool) {}

  async create(campaign: ReviewCampaign): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO governance_review_campaigns (tenant_id, id, title, created_at, due_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          campaign.tenantId,
          campaign.id,
          campaign.title,
          campaign.createdAt,
          campaign.dueAt ?? null,
        ],
      );
      for (const task of campaign.tasks) {
        await client.query(
          `INSERT INTO governance_review_tasks
            (tenant_id, id, campaign_id, finding, policy, resource_id, assigned_reviewer, route, due_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            task.tenantId,
            task.id,
            task.campaignId,
            task.finding,
            task.policy ?? null,
            task.resourceId ?? null,
            task.assignedReviewer ?? null,
            task.route,
            task.dueAt ?? null,
            task.status,
          ],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async get(tenantId: string, campaignId: string): Promise<ReviewCampaign | undefined> {
    const campaign = await this.pool.query<CampaignRow>(
      `SELECT tenant_id, id, title, created_at, due_at
         FROM governance_review_campaigns
        WHERE tenant_id = $1 AND id = $2`,
      [tenantId, campaignId],
    );
    const row = campaign.rows[0];
    return row ? this.hydrate(row) : undefined;
  }

  async list(tenantId: string): Promise<readonly ReviewCampaign[]> {
    const campaigns = await this.pool.query<CampaignRow>(
      `SELECT tenant_id, id, title, created_at, due_at
         FROM governance_review_campaigns
        WHERE tenant_id = $1
        ORDER BY created_at DESC, id DESC`,
      [tenantId],
    );
    return Promise.all(campaigns.rows.map((campaign) => this.hydrate(campaign)));
  }

  async appendDecision(
    tenantId: string,
    taskId: string,
    decision: ReviewDecisionRecord,
  ): Promise<ReviewTask | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const task = await client.query<TaskRow>(
        `SELECT tenant_id, id, campaign_id, finding, policy, resource_id, assigned_reviewer, route, due_at, status
           FROM governance_review_tasks
          WHERE tenant_id = $1 AND id = $2
          FOR UPDATE`,
        [tenantId, taskId],
      );
      const current = task.rows[0];
      if (!current) {
        await client.query('ROLLBACK');
        return undefined;
      }
      await client.query(
        `INSERT INTO governance_review_task_decisions
          (tenant_id, id, task_id, kind, reviewer, rationale, delegated_to, exception_expires_at, decided_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tenantId,
          decision.id,
          taskId,
          decision.kind,
          decision.reviewer,
          decision.rationale,
          decision.delegatedTo ?? null,
          decision.exceptionExpiresAt ?? null,
          decision.decidedAt,
        ],
      );
      const delegated = decision.kind === 'delegate';
      await client.query(
        `UPDATE governance_review_tasks
            SET assigned_reviewer = $3,
                route = $4,
                status = $5
          WHERE tenant_id = $1 AND id = $2`,
        [
          tenantId,
          taskId,
          delegated ? decision.delegatedTo : current.assigned_reviewer,
          delegated ? 'delegated' : current.route,
          delegated ? 'open' : 'completed',
        ],
      );
      await client.query('COMMIT');
      return this.taskWithDecisions(this.pool, tenantId, taskId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async hydrate(campaign: CampaignRow): Promise<ReviewCampaign> {
    const tasks = await this.pool.query<TaskRow>(
      `SELECT tenant_id, id, campaign_id, finding, policy, resource_id, assigned_reviewer, route, due_at, status
         FROM governance_review_tasks
        WHERE tenant_id = $1 AND campaign_id = $2
        ORDER BY id`,
      [campaign.tenant_id, campaign.id],
    );
    const hydratedTasks = await Promise.all(
      tasks.rows.map((task) => this.taskWithDecisions(this.pool, task.tenant_id, task.id)),
    );
    return {
      id: campaign.id,
      tenantId: campaign.tenant_id,
      title: campaign.title,
      createdAt: campaign.created_at.toISOString(),
      ...(campaign.due_at ? { dueAt: campaign.due_at.toISOString() } : {}),
      status:
        hydratedTasks.length && hydratedTasks.every((task) => task.status === 'completed')
          ? 'complete'
          : 'open',
      tasks: hydratedTasks,
    };
  }

  private async taskWithDecisions(
    queryable: Pool | PoolClient,
    tenantId: string,
    taskId: string,
  ): Promise<ReviewTask> {
    const task = await queryable.query<TaskRow>(
      `SELECT tenant_id, id, campaign_id, finding, policy, resource_id, assigned_reviewer, route, due_at, status
         FROM governance_review_tasks
        WHERE tenant_id = $1 AND id = $2`,
      [tenantId, taskId],
    );
    const row = task.rows[0];
    if (!row) throw new Error(`Review task ${taskId} not found`);
    const decisions = await queryable.query<DecisionRow>(
      `SELECT tenant_id, id, task_id, kind, reviewer, rationale, delegated_to, exception_expires_at, decided_at
         FROM governance_review_task_decisions
        WHERE tenant_id = $1 AND task_id = $2
        ORDER BY decided_at, id`,
      [tenantId, taskId],
    );
    return {
      id: row.id,
      tenantId: row.tenant_id,
      campaignId: row.campaign_id,
      finding: row.finding,
      ...(row.policy ? { policy: row.policy } : {}),
      ...(row.resource_id ? { resourceId: row.resource_id } : {}),
      ...(row.assigned_reviewer ? { assignedReviewer: row.assigned_reviewer } : {}),
      route: row.route,
      ...(row.due_at ? { dueAt: row.due_at.toISOString() } : {}),
      status: row.status,
      decisions: decisions.rows.map((decision) => ({
        id: decision.id,
        kind: decision.kind,
        reviewer: decision.reviewer,
        rationale: decision.rationale,
        ...(decision.delegated_to ? { delegatedTo: decision.delegated_to } : {}),
        ...(decision.exception_expires_at
          ? { exceptionExpiresAt: decision.exception_expires_at.toISOString() }
          : {}),
        decidedAt: decision.decided_at.toISOString(),
      })),
    };
  }
}
