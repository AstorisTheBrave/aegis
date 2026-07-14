import type { Finding } from '@aegis/findings';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';

export type CampaignStatus = 'open' | 'complete';
export type ReviewTaskStatus = 'open' | 'completed';
export type ReviewDecisionKind = 'retain' | 'remove_recommended' | 'delegate' | 'exception';
export type ReviewRoute = 'resource_owner' | 'fallback_reviewer' | 'unassigned' | 'delegated';

export interface ReviewDecisionRecord {
  readonly id: string;
  readonly kind: ReviewDecisionKind;
  readonly reviewer: string;
  readonly rationale: string;
  readonly delegatedTo?: string;
  readonly exceptionExpiresAt?: string;
  readonly decidedAt: string;
}

export interface ReviewTask {
  readonly id: string;
  readonly tenantId: string;
  readonly campaignId: string;
  readonly finding: Finding;
  readonly resourceId?: string;
  readonly assignedReviewer?: string;
  readonly route: ReviewRoute;
  readonly dueAt?: string;
  readonly status: ReviewTaskStatus;
  readonly decisions: readonly ReviewDecisionRecord[];
}

export interface ReviewCampaign {
  readonly id: string;
  readonly tenantId: string;
  readonly title: string;
  readonly createdAt: string;
  readonly dueAt?: string;
  readonly status: CampaignStatus;
  readonly tasks: readonly ReviewTask[];
}

export interface ReviewCampaignRepository {
  create(campaign: ReviewCampaign): Promise<void>;
  get(tenantId: string, campaignId: string): Promise<ReviewCampaign | undefined>;
  list(tenantId: string): Promise<readonly ReviewCampaign[]>;
  appendDecision(
    tenantId: string,
    taskId: string,
    decision: ReviewDecisionRecord,
  ): Promise<ReviewTask | undefined>;
}

export interface CampaignResource {
  readonly id: string;
  readonly businessOwner?: string;
}

export interface CreateCampaignInput {
  readonly tenantId: string;
  readonly title: string;
  readonly findings: readonly Finding[];
  readonly resources: readonly CampaignResource[];
  readonly fallbackReviewer?: string;
  readonly dueAt?: string;
  readonly actor: string;
  readonly createdAt: string;
}

export interface DecideReviewTaskInput {
  readonly tenantId: string;
  readonly taskId: string;
  readonly kind: ReviewDecisionKind;
  readonly reviewer: string;
  readonly rationale: string;
  readonly decidedAt: string;
  readonly delegatedTo?: string;
  readonly exceptionExpiresAt?: string;
}

export class InMemoryReviewCampaignRepository implements ReviewCampaignRepository {
  readonly #campaigns = new Map<string, ReviewCampaign>();

  async create(campaign: ReviewCampaign): Promise<void> {
    if (this.#campaigns.has(key(campaign.tenantId, campaign.id))) {
      throw new Error(`Review campaign ${campaign.id} already exists`);
    }
    this.#campaigns.set(key(campaign.tenantId, campaign.id), campaign);
  }

  async get(tenantId: string, campaignId: string): Promise<ReviewCampaign | undefined> {
    return this.#campaigns.get(key(tenantId, campaignId));
  }

  async list(tenantId: string): Promise<readonly ReviewCampaign[]> {
    return [...this.#campaigns.values()]
      .filter((campaign) => campaign.tenantId === tenantId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async appendDecision(
    tenantId: string,
    taskId: string,
    decision: ReviewDecisionRecord,
  ): Promise<ReviewTask | undefined> {
    const campaign = [...this.#campaigns.values()].find(
      (item) => item.tenantId === tenantId && item.tasks.some((task) => task.id === taskId),
    );
    if (!campaign) return;
    const tasks = campaign.tasks.map((task) => {
      if (task.id !== taskId) return task;
      return nextTask(task, decision);
    });
    const nextCampaign = { ...campaign, tasks, status: campaignStatus(tasks) };
    this.#campaigns.set(key(tenantId, campaign.id), nextCampaign);
    return tasks.find((task) => task.id === taskId);
  }
}

export class ReviewCampaignService {
  constructor(
    private readonly repository: ReviewCampaignRepository,
    private readonly audit: AuditLedger,
  ) {}

  list(tenantId: string): Promise<readonly ReviewCampaign[]> {
    return this.repository.list(tenantId);
  }

  get(tenantId: string, campaignId: string): Promise<ReviewCampaign | undefined> {
    return this.repository.get(tenantId, campaignId);
  }

  async create(input: CreateCampaignInput): Promise<ReviewCampaign> {
    const owners = new Map(
      input.resources.map((resource) => [resource.id, resource.businessOwner]),
    );
    const id = `campaign:${input.createdAt}:${input.findings.map((finding) => finding.id).join('|')}`;
    const tasks = input.findings.map((finding, index) => {
      const resourceId = finding.subject.resourceId;
      const owner = resourceId ? owners.get(resourceId) : undefined;
      const route: ReviewRoute = owner
        ? 'resource_owner'
        : input.fallbackReviewer
          ? 'fallback_reviewer'
          : 'unassigned';
      return {
        id: `task:${id}:${index + 1}`,
        tenantId: input.tenantId,
        campaignId: id,
        finding,
        ...(resourceId ? { resourceId } : {}),
        ...(owner || input.fallbackReviewer
          ? { assignedReviewer: owner ?? input.fallbackReviewer }
          : {}),
        route,
        ...(input.dueAt ? { dueAt: input.dueAt } : {}),
        status: 'open' as const,
        decisions: [],
      };
    });
    const campaign: ReviewCampaign = {
      id,
      tenantId: input.tenantId,
      title: input.title,
      createdAt: input.createdAt,
      ...(input.dueAt ? { dueAt: input.dueAt } : {}),
      status: campaignStatus(tasks),
      tasks,
    };
    await this.repository.create(campaign);
    await this.audit.append({
      tenantId: input.tenantId,
      occurredAt: input.createdAt,
      actor: input.actor,
      type: 'review.campaign.created',
      data: { campaignId: campaign.id, taskCount: tasks.length, dueAt: input.dueAt },
    });
    return campaign;
  }

  async decide(input: DecideReviewTaskInput): Promise<ReviewTask> {
    if (!input.rationale.trim()) throw new Error('A decision rationale is required');
    if (input.kind === 'delegate' && !input.delegatedTo?.trim()) {
      throw new Error('A delegate reviewer is required');
    }
    if (input.kind === 'exception' && !input.exceptionExpiresAt?.trim()) {
      throw new Error('An exception expiry is required');
    }
    const decision: ReviewDecisionRecord = {
      id: `decision:${input.taskId}:${input.decidedAt}:${input.kind}`,
      kind: input.kind,
      reviewer: input.reviewer,
      rationale: input.rationale,
      ...(input.delegatedTo ? { delegatedTo: input.delegatedTo } : {}),
      ...(input.exceptionExpiresAt ? { exceptionExpiresAt: input.exceptionExpiresAt } : {}),
      decidedAt: input.decidedAt,
    };
    const task = await this.repository.appendDecision(input.tenantId, input.taskId, decision);
    if (!task) throw new Error('Review task not found');
    await this.audit.append({
      tenantId: input.tenantId,
      occurredAt: input.decidedAt,
      actor: input.reviewer,
      type: 'review.task.decision.recorded',
      data: {
        taskId: input.taskId,
        decision: input.kind,
        ...(input.delegatedTo ? { delegatedTo: input.delegatedTo } : {}),
        ...(input.exceptionExpiresAt ? { exceptionExpiresAt: input.exceptionExpiresAt } : {}),
        providerMutation: false,
      },
    });
    return task;
  }
}

function key(tenantId: string, campaignId: string): string {
  return `${tenantId}:${campaignId}`;
}

function nextTask(task: ReviewTask, decision: ReviewDecisionRecord): ReviewTask {
  const delegated = decision.kind === 'delegate';
  return {
    ...task,
    ...(delegated ? { assignedReviewer: decision.delegatedTo, route: 'delegated' as const } : {}),
    status: delegated ? 'open' : 'completed',
    decisions: [...task.decisions, decision],
  };
}

function campaignStatus(tasks: readonly ReviewTask[]): CampaignStatus {
  return tasks.length && tasks.every((task) => task.status === 'completed') ? 'complete' : 'open';
}
