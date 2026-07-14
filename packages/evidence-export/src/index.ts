import { createHash } from 'node:crypto';
import type { AuditLedger, AuditRecord } from '@open-saas-governance/audit-ledger';
import { canonicalJson } from '@open-saas-governance/audit-ledger';
import type { ReviewCampaign } from '@aegis/reviews';

export interface EvidenceBundle {
  readonly tenantId: string;
  readonly exportedAt: string;
  readonly records: readonly AuditRecord[];
  readonly sha256: string;
}

export interface EvidenceFile {
  readonly name: 'campaign.json' | 'findings.json' | 'audit-ledger.json';
  readonly content: string;
  readonly sha256: string;
}

export interface CampaignEvidenceBundle {
  readonly format: 'aegis.review-evidence.v1';
  readonly tenantId: string;
  readonly exportedAt: string;
  readonly campaignId: string;
  readonly files: readonly EvidenceFile[];
  readonly manifestSha256: string;
}

export async function exportEvidence(
  ledger: AuditLedger,
  tenantId: string,
  exportedAt: string,
): Promise<EvidenceBundle> {
  const records = await ledger.list(tenantId);
  const payload = canonicalJson({ tenantId, exportedAt, records });
  return {
    tenantId,
    exportedAt,
    records,
    sha256: sha256(payload),
  };
}

export async function exportCampaignEvidence(
  ledger: AuditLedger,
  campaign: ReviewCampaign,
  exportedAt: string,
): Promise<CampaignEvidenceBundle> {
  const records = await ledger.list(campaign.tenantId);
  const relevantRecords = records.filter((record) => {
    const data = record.data as Readonly<Record<string, unknown>>;
    return (
      data.campaignId === campaign.id || campaign.tasks.some((task) => data.taskId === task.id)
    );
  });
  const files: readonly EvidenceFile[] = [
    file('campaign.json', canonicalJson(campaign)),
    file('findings.json', canonicalJson(campaign.tasks.map((task) => task.finding))),
    file('audit-ledger.json', canonicalJson(relevantRecords)),
  ];
  const manifest = canonicalJson({
    format: 'aegis.review-evidence.v1',
    tenantId: campaign.tenantId,
    exportedAt,
    campaignId: campaign.id,
    files: files.map(({ name, sha256: hash }) => ({ name, sha256: hash })),
  });
  return {
    format: 'aegis.review-evidence.v1',
    tenantId: campaign.tenantId,
    exportedAt,
    campaignId: campaign.id,
    files,
    manifestSha256: sha256(manifest),
  };
}

export function verifyCampaignEvidence(bundle: CampaignEvidenceBundle): {
  readonly valid: boolean;
} {
  const filesAreValid = bundle.files.every((item) => sha256(item.content) === item.sha256);
  const manifest = canonicalJson({
    format: bundle.format,
    tenantId: bundle.tenantId,
    exportedAt: bundle.exportedAt,
    campaignId: bundle.campaignId,
    files: bundle.files.map(({ name, sha256: hash }) => ({ name, sha256: hash })),
  });
  return { valid: filesAreValid && sha256(manifest) === bundle.manifestSha256 };
}

function file(name: EvidenceFile['name'], content: string): EvidenceFile {
  return { name, content, sha256: sha256(content) };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
