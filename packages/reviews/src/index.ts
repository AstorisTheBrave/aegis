import type { Finding } from '@aegis/findings';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';
export type ReviewDecision = 'approved' | 'revocation_requested' | 'needs_information';
export interface ReviewItem {
  readonly id: string;
  readonly finding: Finding;
  decision?: ReviewDecision;
  reviewer?: string;
  decidedAt?: string;
}
export class ReviewService {
  readonly #items = new Map<string, ReviewItem>();
  constructor(private readonly audit: AuditLedger) {}
  create(finding: Finding) {
    const item: ReviewItem = { id: `review:${finding.id}`, finding };
    this.#items.set(item.id, item);
    return item;
  }
  async decide(input: {
    tenantId: string;
    itemId: string;
    reviewer: string;
    decision: ReviewDecision;
    at: string;
  }) {
    const item = this.#items.get(input.itemId);
    if (!item) throw new Error('Review item not found');
    if (item.decision) throw new Error('Review item has already been decided');
    const decided = {
      ...item,
      decision: input.decision,
      reviewer: input.reviewer,
      decidedAt: input.at,
    };
    this.#items.set(item.id, decided);
    await this.audit.append({
      tenantId: input.tenantId,
      occurredAt: input.at,
      actor: input.reviewer,
      type: 'review.decided',
      data: { itemId: item.id, findingId: item.finding.id, decision: input.decision },
    });
    return decided;
  }
}
