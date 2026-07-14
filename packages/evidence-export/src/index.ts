import { createHash } from 'node:crypto';
import type { AuditLedger, AuditRecord } from '@open-saas-governance/audit-ledger';
export interface EvidenceBundle {
  readonly tenantId: string;
  readonly exportedAt: string;
  readonly records: readonly AuditRecord[];
  readonly sha256: string;
}
export async function exportEvidence(
  ledger: AuditLedger,
  tenantId: string,
  exportedAt: string,
): Promise<EvidenceBundle> {
  const records = await ledger.list(tenantId);
  const payload = JSON.stringify({ tenantId, exportedAt, records });
  return {
    tenantId,
    exportedAt,
    records,
    sha256: createHash('sha256').update(payload).digest('hex'),
  };
}
