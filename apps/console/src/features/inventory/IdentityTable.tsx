import type { IdentitySummary } from '../../lib/api.js';
import { ChevronRight } from 'lucide-react';
import { ProviderLogo } from '../../components/ProviderLogo.js';

interface IdentityTableProps {
  readonly identities: readonly IdentitySummary[];
  readonly loading: boolean;
  readonly selectedIdentityId?: string;
  readonly onSelect: (identity: IdentitySummary) => void;
}

function statusLabel(status: IdentitySummary['status']): string {
  if (status === 'requires_review') return 'Requires review';
  if (status === 'suspended') return 'Suspended';
  return 'Active';
}

export function IdentityTable({
  identities,
  loading,
  selectedIdentityId,
  onSelect,
}: IdentityTableProps) {
  if (loading) return <p className="table-state">Loading identities…</p>;
  if (!identities.length) return <p className="table-state">No identities match this search.</p>;

  return (
    <div className="identity-table-wrap">
      <table className="identity-table">
        <thead>
          <tr>
            <th scope="col">Identity</th>
            <th scope="col">Source</th>
            <th scope="col">Platform</th>
            <th scope="col">Access status</th>
            <th scope="col">Privileged</th>
            <th scope="col">Last seen</th>
          </tr>
        </thead>
        <tbody>
          {identities.map((identity) => {
            const selected = identity.id === selectedIdentityId;
            return (
              <tr
                aria-selected={selected}
                className={selected ? 'is-selected' : undefined}
                key={identity.id}
                onClick={() => onSelect(identity)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(identity);
                  }
                }}
                tabIndex={0}
              >
                <td>
                  <span className="identity-cell">
                    <span className="identity-avatar">{identity.displayName.slice(0, 1)}</span>
                    <span>
                      <strong>{identity.displayName}</strong>
                      <small>{identity.email}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="source-cell">
                    <ProviderLogo decorative provider={identity.source} />
                    <span>
                      <strong>{identity.source}</strong>
                      <small>{identity.sourceAccount}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <strong>{identity.platform}</strong>
                  <small>{identity.platformType}</small>
                </td>
                <td>
                  <span className={`status status-${identity.status}`}>
                    <span aria-hidden="true">●</span> {statusLabel(identity.status)}
                  </span>
                </td>
                <td>{identity.privileged ? 'Yes' : 'No'}</td>
                <td>
                  <span className="last-seen">
                    {identity.lastSeen}{' '}
                    <ChevronRight aria-hidden="true" size={14} strokeWidth={1.7} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
