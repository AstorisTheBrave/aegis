import type { AccessRequest, AccessRequestRepository } from '@aegis/access-requests';
import type { Pool } from 'pg';
type Row = { request: AccessRequest };
export class PostgresAccessRequestRepository implements AccessRequestRepository {
  constructor(private readonly pool: Pool) {}
  async get(t: string, id: string) {
    const r = await this.pool.query<Row>(
      'SELECT request FROM governance_access_requests WHERE tenant_id=$1 AND id=$2',
      [t, id],
    );
    return r.rows[0]?.request;
  }
  async findByIdempotencyKey(t: string, k: string) {
    const r = await this.pool.query<Row>(
      'SELECT request FROM governance_access_requests WHERE tenant_id=$1 AND idempotency_key=$2',
      [t, k],
    );
    return r.rows[0]?.request;
  }
  async createIfAbsent(x: AccessRequest) {
    const r = await this.pool.query<Row>(
      'INSERT INTO governance_access_requests (tenant_id,id,idempotency_key,requested_at,request) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id,idempotency_key) DO NOTHING RETURNING request',
      [x.tenantId, x.id, x.idempotencyKey, x.requestedAt, x],
    );
    if (r.rows[0]) return r.rows[0].request;
    const e = await this.findByIdempotencyKey(x.tenantId, x.idempotencyKey);
    if (!e) throw new Error('Request idempotency record was not available after conflict');
    return e;
  }
  async save(x: AccessRequest) {
    await this.pool.query(
      'INSERT INTO governance_access_requests (tenant_id,id,idempotency_key,requested_at,request) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id,id) DO UPDATE SET request=EXCLUDED.request',
      [x.tenantId, x.id, x.idempotencyKey, x.requestedAt, x],
    );
  }
  async list(t: string) {
    const r = await this.pool.query<Row>(
      'SELECT request FROM governance_access_requests WHERE tenant_id=$1 ORDER BY requested_at DESC,id DESC',
      [t],
    );
    return r.rows.map((x) => x.request);
  }
}
