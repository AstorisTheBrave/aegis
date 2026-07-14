import { useState } from 'react';
import type { AegisApi } from '../../lib/api.js';

export function ExportEvidenceButton({
  api,
  tenantId,
}: {
  readonly api: AegisApi;
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
      const bundle = await api.exportEvidence(tenantId);
      const href = URL.createObjectURL(
        new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
      );
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `aegis-evidence-${tenantId}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      setChecksum(bundle.sha256);
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
