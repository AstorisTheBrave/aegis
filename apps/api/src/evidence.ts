import { exportCampaignEvidence } from '@aegis/evidence-export';
import type { CampaignEvidenceBundle } from '@aegis/api-contract';
import type { ReviewCampaignRepository } from '@aegis/reviews';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';

export interface CampaignEvidenceReader {
  export(tenantId: string, campaignId: string): Promise<CampaignEvidenceBundle | undefined>;
}

export class StoredCampaignEvidenceReader implements CampaignEvidenceReader {
  constructor(
    private readonly campaigns: ReviewCampaignRepository,
    private readonly audit: AuditLedger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async export(tenantId: string, campaignId: string): Promise<CampaignEvidenceBundle | undefined> {
    const campaign = await this.campaigns.get(tenantId, campaignId);
    return campaign
      ? exportCampaignEvidence(this.audit, campaign, this.now().toISOString())
      : undefined;
  }
}
