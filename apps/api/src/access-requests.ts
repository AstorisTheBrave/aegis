import {
  AccessRequestEngine,
  type AccessCatalogItem,
  type AccessRequestRepository,
  type CreateAccessRequestInput,
} from '@aegis/access-requests';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';
export const defaultAccessCatalog: readonly AccessCatalogItem[] = [
  {
    id: 'github-maintain',
    title: 'GitHub maintain access',
    provider: 'mock-github',
    entitlement: 'maintain',
    reviewer: 'resource-owner@acme.dev',
    maxDurationMinutes: 240,
  },
  {
    id: 'okta-support',
    title: 'Okta support access',
    provider: 'mock-okta',
    entitlement: 'support',
    reviewer: 'resource-owner@acme.dev',
    maxDurationMinutes: 120,
  },
];
export class AccessRequestManager {
  readonly #engine: AccessRequestEngine;
  constructor(
    repository: AccessRequestRepository,
    private readonly audit: AuditLedger,
    now: () => Date = () => new Date(),
  ) {
    this.#engine = new AccessRequestEngine(repository, defaultAccessCatalog, now);
  }
  list(t: string) {
    return this.#engine.list(t);
  }
  async create(t: string, input: CreateAccessRequestInput) {
    const r = await this.#engine.create(t, input);
    await this.audit.append({
      tenantId: t,
      occurredAt: r.requestedAt,
      actor: r.requester,
      type: 'access_request.created',
      correlationId: r.id,
      data: { request: r, providerMutation: false },
    });
    return r;
  }
  async decide(
    t: string,
    id: string,
    input: { reviewer: string; approved: boolean; reason: string },
  ) {
    const r = await this.#engine.decide(t, id, input);
    await this.audit.append({
      tenantId: t,
      occurredAt: r.decision!.decidedAt,
      actor: r.decision!.reviewer,
      type: input.approved ? 'access_request.approved' : 'access_request.denied',
      correlationId: r.id,
      data: { request: r, providerMutation: false },
    });
    return r;
  }
  async activate(t: string, id: string) {
    const r = await this.#engine.activate(t, id);
    await this.audit.append({
      tenantId: t,
      occurredAt: new Date().toISOString(),
      actor: 'access-request-fulfillment',
      type: 'access_request.activated',
      correlationId: r.id,
      data: { request: r, providerMutation: false },
    });
    return r;
  }
  expireDue(t: string) {
    return this.#engine.expireDue(t);
  }
}
