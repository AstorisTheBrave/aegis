import type {
  CreateReviewCampaignInput,
  CreatePolicyReviewCampaignInput,
  RecordCampaignDecisionInput,
  ReviewCampaignSummary,
} from '@aegis/api-contract';
import { evaluateGitHubPolicyPack } from '@aegis/findings';
import {
  policyContext,
  policyEvaluationFinding,
  type PolicyEvaluation,
  type ReviewPolicyId,
} from '@aegis/review-policies';
import {
  ReviewCampaignService,
  type ReviewCampaign,
  type ReviewCampaignRepository,
} from '@aegis/reviews';
import type { AccessGraphRepository, JsonValue } from '@open-saas-governance/access-graph';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';
import type { DiscoveryReviewPolicyManager } from './review-policies.js';

export interface ReviewCampaignManager {
  list(tenantId: string): Promise<readonly ReviewCampaignSummary[]>;
  create(tenantId: string, input: CreateReviewCampaignInput): Promise<ReviewCampaignSummary>;
  decide(
    tenantId: string,
    campaignId: string,
    taskId: string,
    input: RecordCampaignDecisionInput,
  ): Promise<ReviewCampaignSummary | undefined>;
}

export class GraphReviewCampaignManager implements ReviewCampaignManager {
  private readonly service: ReviewCampaignService;

  constructor(
    private readonly graph: AccessGraphRepository,
    repository: ReviewCampaignRepository,
    audit: AuditLedger,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.service = new ReviewCampaignService(repository, audit);
  }

  async list(tenantId: string): Promise<readonly ReviewCampaignSummary[]> {
    return (await this.service.list(tenantId)).map(toSummary);
  }

  async create(tenantId: string, input: CreateReviewCampaignInput): Promise<ReviewCampaignSummary> {
    const [findings, resources] = await Promise.all([
      evaluateGitHubPolicyPack(this.graph, tenantId, this.now()),
      this.graph.listResources(tenantId),
    ]);
    const selected = input.findingIds?.length
      ? findings.filter((finding) => input.findingIds?.includes(finding.id))
      : findings;
    if (input.findingIds?.length && selected.length !== input.findingIds.length) {
      throw new Error('One or more findings are not available for this tenant');
    }
    const campaign = await this.service.create({
      tenantId,
      title: input.title,
      findings: selected,
      resources: resources.map((resource) => ({
        id: resource.id,
        businessOwner: stringAttribute(resource.attributes, 'businessOwner'),
      })),
      fallbackReviewer: input.fallbackReviewer,
      dueAt: input.dueAt,
      actor: input.actor,
      createdAt: this.now().toISOString(),
    });
    return toSummary(campaign);
  }

  async decide(
    tenantId: string,
    campaignId: string,
    taskId: string,
    input: RecordCampaignDecisionInput,
  ): Promise<ReviewCampaignSummary | undefined> {
    const campaign = await this.service.get(tenantId, campaignId);
    if (!campaign || !campaign.tasks.some((task) => task.id === taskId)) return undefined;
    await this.service.decide({
      tenantId,
      taskId,
      kind: input.kind,
      reviewer: input.reviewer,
      rationale: input.rationale,
      delegatedTo: input.delegatedTo,
      exceptionExpiresAt: input.exceptionExpiresAt,
      decidedAt: this.now().toISOString(),
    });
    const updated = await this.service.get(tenantId, campaignId);
    return updated ? toSummary(updated) : undefined;
  }
}

export function toSummary(campaign: ReviewCampaign): ReviewCampaignSummary {
  return {
    id: campaign.id,
    title: campaign.title,
    createdAt: campaign.createdAt,
    ...(campaign.dueAt ? { dueAt: campaign.dueAt } : {}),
    status: campaign.status,
    tasks: campaign.tasks.map((task) => ({
      id: task.id,
      findingId: task.finding.id,
      findingTitle: task.finding.title,
      ...(task.policy ? { policy: task.policy } : {}),
      severity: task.finding.severity,
      ...(task.assignedReviewer ? { assignedReviewer: task.assignedReviewer } : {}),
      route: task.route,
      ...(task.dueAt ? { dueAt: task.dueAt } : {}),
      status: task.status,
      decisionCount: task.decisions.length,
      decisions: task.decisions.map((decision) => ({
        id: decision.id,
        kind: decision.kind,
        reviewer: decision.reviewer,
        rationale: decision.rationale,
        decidedAt: decision.decidedAt,
      })),
    })),
  };
}

export class PolicyReviewCampaignManager {
  private readonly service: ReviewCampaignService;

  constructor(
    private readonly policies: DiscoveryReviewPolicyManager,
    repository: ReviewCampaignRepository,
    private readonly audit: AuditLedger,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.service = new ReviewCampaignService(repository, audit);
  }

  async list(tenantId: string): Promise<readonly ReviewCampaignSummary[]> {
    return (await this.service.list(tenantId))
      .filter((campaign) => campaign.tasks.some((task) => task.policy))
      .map(toSummary);
  }

  async create(
    tenantId: string,
    input: CreatePolicyReviewCampaignInput,
  ): Promise<ReviewCampaignSummary> {
    const policyIds = input.policyIds ?? [];
    if (policyIds.some((policyId) => !isReviewPolicyId(policyId))) {
      throw new Error('One or more requested review policies are not available');
    }
    const evaluations = (await this.policies.list(tenantId)).filter(
      (evaluation) =>
        evaluation.recommendation === 'review_required' &&
        (!policyIds.length || policyIds.includes(evaluation.policyId)),
    );
    if (!evaluations.length)
      throw new Error('No policy review subjects are available for this tenant');
    const findings = evaluations.map(policyEvaluationFinding);
    const campaign = await this.service.create({
      tenantId,
      title: input.title,
      findings,
      policyContexts: Object.fromEntries(
        evaluations.map((evaluation, index) => [findings[index]!.id, policyContext(evaluation)]),
      ),
      resources: evaluations.map((evaluation) => ({
        id: evaluation.subject.id,
        businessOwner: evaluation.subject.owners[0],
      })),
      fallbackReviewer: input.fallbackReviewer,
      dueAt: input.dueAt,
      actor: input.actor,
      createdAt: this.now().toISOString(),
    });
    await Promise.all(
      evaluations.map((evaluation) => this.recordEvaluation(campaign.id, input.actor, evaluation)),
    );
    return toSummary(campaign);
  }

  async decide(
    tenantId: string,
    campaignId: string,
    taskId: string,
    input: RecordCampaignDecisionInput,
  ): Promise<ReviewCampaignSummary | undefined> {
    const campaign = await this.service.get(tenantId, campaignId);
    if (!campaign || !campaign.tasks.some((task) => task.id === taskId && task.policy)) return;
    await this.service.decide({
      tenantId,
      taskId,
      kind: input.kind,
      reviewer: input.reviewer,
      rationale: input.rationale,
      delegatedTo: input.delegatedTo,
      exceptionExpiresAt: input.exceptionExpiresAt,
      decidedAt: this.now().toISOString(),
    });
    const updated = await this.service.get(tenantId, campaignId);
    return updated ? toSummary(updated) : undefined;
  }

  private recordEvaluation(campaignId: string, actor: string, evaluation: PolicyEvaluation) {
    return this.audit.append({
      tenantId: evaluation.subject.tenantId,
      occurredAt: this.now().toISOString(),
      actor,
      type: 'review.policy.evaluated',
      data: {
        campaignId,
        policyId: evaluation.policyId,
        subjectId: evaluation.subject.id,
        subjectKind: evaluation.subject.kind,
        evidence: evaluation.evidence,
        recommendation: evaluation.recommendation,
        providerMutation: false,
      },
    });
  }
}

function isReviewPolicyId(value: string): value is ReviewPolicyId {
  return value === 'application-owner.v1' || value === 'non-human-identity.v1';
}

function stringAttribute(
  attributes: Readonly<Record<string, JsonValue>>,
  key: string,
): string | undefined {
  const value = attributes[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}
