export const accessRequestSchemaVersion = 'access-request.v1' as const;
export type AccessRequestStatus =
  'pending' | 'approved' | 'denied' | 'active' | 'expired' | 'cancelled';
export interface AccessCatalogItem {
  readonly id: string;
  readonly title: string;
  readonly provider: string;
  readonly entitlement: string;
  readonly reviewer: string;
  readonly maxDurationMinutes: number;
}
export interface CreateAccessRequestInput {
  readonly catalogItemId: string;
  readonly requester: string;
  readonly rationale: string;
  readonly durationMinutes: number;
  readonly idempotencyKey: string;
}
export interface AccessRequest {
  readonly schemaVersion: typeof accessRequestSchemaVersion;
  readonly id: string;
  readonly tenantId: string;
  readonly catalogItem: AccessCatalogItem;
  readonly requester: string;
  readonly rationale: string;
  readonly durationMinutes: number;
  readonly requestedAt: string;
  readonly expiresAt?: string;
  readonly status: AccessRequestStatus;
  readonly decision?: {
    readonly reviewer: string;
    readonly reason: string;
    readonly decidedAt: string;
  };
  readonly idempotencyKey: string;
  readonly simulatedFulfillment: {
    readonly requiresControlledAction: true;
    readonly providerMutation: false;
  };
}
export interface AccessRequestRepository {
  get(tenantId: string, id: string): Promise<AccessRequest | undefined>;
  findByIdempotencyKey(tenantId: string, key: string): Promise<AccessRequest | undefined>;
  createIfAbsent(request: AccessRequest): Promise<AccessRequest>;
  save(request: AccessRequest): Promise<void>;
  list(tenantId: string): Promise<readonly AccessRequest[]>;
}
export class InMemoryAccessRequestRepository implements AccessRequestRepository {
  readonly #items = new Map<string, AccessRequest>();
  async get(t: string, id: string) {
    return this.#items.get(`${t}:${id}`);
  }
  async findByIdempotencyKey(t: string, k: string) {
    return [...this.#items.values()].find((x) => x.tenantId === t && x.idempotencyKey === k);
  }
  async createIfAbsent(r: AccessRequest) {
    const e = await this.findByIdempotencyKey(r.tenantId, r.idempotencyKey);
    if (e) return e;
    this.#items.set(`${r.tenantId}:${r.id}`, r);
    return r;
  }
  async save(r: AccessRequest) {
    this.#items.set(`${r.tenantId}:${r.id}`, r);
  }
  async list(t: string) {
    return [...this.#items.values()]
      .filter((x) => x.tenantId === t)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }
}
export class AccessRequestEngine {
  constructor(
    private readonly repository: AccessRequestRepository,
    private readonly catalog: readonly AccessCatalogItem[],
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => globalThis.crypto.randomUUID(),
  ) {}
  async create(tenantId: string, input: CreateAccessRequestInput) {
    return (await this.createWithStatus(tenantId, input)).request;
  }
  async createWithStatus(tenantId: string, input: CreateAccessRequestInput) {
    const item = this.catalog.find((x) => x.id === input.catalogItemId);
    if (!item) throw new Error('Access catalog item was not found');
    if (!input.requester.trim() || !input.rationale.trim() || !input.idempotencyKey.trim())
      throw new Error('Requester, rationale, and idempotency key are required');
    if (
      !Number.isInteger(input.durationMinutes) ||
      input.durationMinutes < 1 ||
      input.durationMinutes > Math.min(1440, item.maxDurationMinutes)
    )
      throw new Error('Requested duration is not allowed');
    const request: AccessRequest = {
      schemaVersion: accessRequestSchemaVersion,
      id: `access-request:${this.createId()}`,
      tenantId,
      catalogItem: item,
      requester: input.requester.trim().toLowerCase(),
      rationale: input.rationale.trim(),
      durationMinutes: input.durationMinutes,
      requestedAt: this.now().toISOString(),
      status: 'pending',
      idempotencyKey: input.idempotencyKey,
      simulatedFulfillment: { requiresControlledAction: true, providerMutation: false },
    };
    const persisted = await this.repository.createIfAbsent(request);
    return { request: persisted, created: persisted.id === request.id };
  }
  async decide(
    t: string,
    id: string,
    input: { reviewer: string; approved: boolean; reason: string },
  ) {
    const r = await this.require(t, id);
    if (r.status !== 'pending') throw new Error('Only pending access requests can be decided');
    const reviewer = input.reviewer.trim().toLowerCase();
    if (!reviewer || !input.reason.trim()) throw new Error('Reviewer and reason are required');
    if (reviewer === r.requester || reviewer !== r.catalogItem.reviewer.toLowerCase())
      throw new Error('A distinct routed reviewer is required');
    const at = this.now();
    const updated: AccessRequest = {
      ...r,
      status: input.approved ? 'approved' : 'denied',
      ...(input.approved
        ? { expiresAt: new Date(at.valueOf() + r.durationMinutes * 60000).toISOString() }
        : {}),
      decision: { reviewer, reason: input.reason.trim(), decidedAt: at.toISOString() },
    };
    await this.repository.save(updated);
    return updated;
  }
  async activate(t: string, id: string) {
    const r = await this.require(t, id);
    if (r.status !== 'approved') throw new Error('Only approved access requests can become active');
    if (r.expiresAt && new Date(r.expiresAt) <= this.now()) {
      const expired = { ...r, status: 'expired' as const };
      await this.repository.save(expired);
      throw new Error('Expired access requests cannot become active');
    }
    const u = { ...r, status: 'active' as const };
    await this.repository.save(u);
    return u;
  }
  async expireDue(t: string) {
    const now = this.now();
    const items = await this.repository.list(t);
    return Promise.all(
      items.map(async (r) => {
        if (
          (r.status === 'approved' || r.status === 'active') &&
          r.expiresAt &&
          new Date(r.expiresAt) <= now
        ) {
          const u = { ...r, status: 'expired' as const };
          await this.repository.save(u);
          return u;
        }
        return r;
      }),
    );
  }
  async list(t: string) {
    return this.expireDue(t);
  }
  private async require(t: string, id: string) {
    const r = await this.repository.get(t, id);
    if (!r) throw new Error('Access request not found');
    return r;
  }
}
