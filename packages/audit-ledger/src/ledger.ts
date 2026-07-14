import { createHash } from 'node:crypto';

export type AuditData = Readonly<Record<string, unknown>>;

export interface AuditRecordInput {
  readonly tenantId: string;
  readonly occurredAt: string;
  readonly actor: string;
  readonly type: string;
  readonly data: AuditData;
  readonly correlationId?: string;
}

export interface AuditRecord extends AuditRecordInput {
  readonly sequence: number;
  readonly previousHash: string | null;
  readonly hash: string;
}

export interface AuditLedger {
  append(input: AuditRecordInput): Promise<AuditRecord>;
  list(tenantId: string): Promise<readonly AuditRecord[]>;
}

export function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return JSON.stringify(value);
  }

  if (value === undefined) {
    throw new Error('Audit data must not contain undefined values');
  }

  if (typeof value !== 'object') {
    throw new Error(`Audit data must be JSON-compatible; received ${typeof value}`);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(',')}}`;
}

export function calculateAuditHash(
  input: AuditRecordInput,
  sequence: number,
  previousHash: string | null,
): string {
  return createHash('sha256')
    .update(canonicalJson({ ...input, previousHash, sequence }))
    .digest('hex');
}

export function verifyAuditChain(records: readonly AuditRecord[]): boolean {
  let previousHash: string | null = null;
  let previousSequence = 0;

  for (const record of records) {
    if (record.sequence !== previousSequence + 1 || record.previousHash !== previousHash) {
      return false;
    }

    if (
      calculateAuditHash(
        {
          tenantId: record.tenantId,
          occurredAt: record.occurredAt,
          actor: record.actor,
          type: record.type,
          data: record.data,
          correlationId: record.correlationId,
        },
        record.sequence,
        record.previousHash,
      ) !== record.hash
    ) {
      return false;
    }

    previousHash = record.hash;
    previousSequence = record.sequence;
  }

  return true;
}

export class InMemoryAuditLedger implements AuditLedger {
  readonly #recordsByTenant = new Map<string, AuditRecord[]>();

  async append(input: AuditRecordInput): Promise<AuditRecord> {
    const records = this.#recordsByTenant.get(input.tenantId) ?? [];
    const prior = records.at(-1);
    const record: AuditRecord = {
      ...input,
      sequence: records.length + 1,
      previousHash: prior?.hash ?? null,
      hash: calculateAuditHash(input, records.length + 1, prior?.hash ?? null),
    };

    records.push(record);
    this.#recordsByTenant.set(input.tenantId, records);
    return record;
  }

  async list(tenantId: string): Promise<readonly AuditRecord[]> {
    return this.#recordsByTenant.get(tenantId) ?? [];
  }
}
