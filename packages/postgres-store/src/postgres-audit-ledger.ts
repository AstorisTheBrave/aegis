import {
  calculateAuditHash,
  type AuditLedger,
  type AuditRecord,
  type AuditRecordInput,
} from '@open-saas-governance/audit-ledger';
import type { Pool } from 'pg';

type AuditRow = {
  tenant_id: string;
  sequence: string;
  occurred_at: Date;
  actor: string;
  type: string;
  data: Record<string, unknown>;
  correlation_id: string | null;
  previous_hash: string | null;
  hash: string;
};

export class PostgresAuditLedger implements AuditLedger {
  constructor(private readonly pool: Pool) {}

  async append(input: AuditRecordInput): Promise<AuditRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.tenantId]);
      const previous = await client.query<Pick<AuditRow, 'sequence' | 'hash'>>(
        `SELECT sequence, hash
           FROM governance_audit_entries
          WHERE tenant_id = $1
          ORDER BY sequence DESC
          LIMIT 1`,
        [input.tenantId],
      );
      const prior = previous.rows[0];
      const sequence = Number(prior?.sequence ?? 0) + 1;
      const previousHash = prior?.hash ?? null;
      const hash = calculateAuditHash(input, sequence, previousHash);

      await client.query(
        `INSERT INTO governance_audit_entries
          (tenant_id, sequence, occurred_at, actor, type, data, correlation_id, previous_hash, hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          input.tenantId,
          sequence,
          input.occurredAt,
          input.actor,
          input.type,
          input.data,
          input.correlationId ?? null,
          previousHash,
          hash,
        ],
      );
      await client.query('COMMIT');
      return { ...input, sequence, previousHash, hash };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async list(tenantId: string): Promise<readonly AuditRecord[]> {
    const result = await this.pool.query<AuditRow>(
      `SELECT tenant_id, sequence, occurred_at, actor, type, data, correlation_id, previous_hash, hash
         FROM governance_audit_entries
        WHERE tenant_id = $1
        ORDER BY sequence`,
      [tenantId],
    );

    return result.rows.map((row) => ({
      tenantId: row.tenant_id,
      sequence: Number(row.sequence),
      occurredAt: row.occurred_at.toISOString(),
      actor: row.actor,
      type: row.type,
      data: row.data,
      ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
      previousHash: row.previous_hash,
      hash: row.hash,
    }));
  }
}
