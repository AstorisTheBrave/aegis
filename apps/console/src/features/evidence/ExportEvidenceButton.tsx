import { useState } from 'react';
import type { AegisApi } from '../../lib/api.js';

export function ExportEvidenceButton({
  api,
  campaignId,
  tenantId,
}: {
  readonly api: AegisApi;
  readonly campaignId?: string;
  readonly tenantId: string;
}) {
  const [checksum, setChecksum] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function exportBundle() {
    if (!tenantId) {
      setError('Choose a tenant before exporting evidence.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const bundle = campaignId
        ? await api.exportCampaignEvidence(tenantId, campaignId)
        : await api.exportEvidence(tenantId);
      const href = URL.createObjectURL(
        new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
      );
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = campaignId
        ? `aegis-review-evidence-${campaignId}.json`
        : `aegis-evidence-${tenantId}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      setChecksum('manifestSha256' in bundle ? bundle.manifestSha256 : bundle.sha256);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Evidence export failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="export-evidence">
      <button disabled={loading} onClick={exportBundle} type="button">
        {loading ? 'Preparing export…' : 'Export evidence'}
      </button>
      {checksum ? <small>SHA-256: {checksum}</small> : null}
      {error ? <small role="alert">{error}</small> : null}
    </div>
  );
}
