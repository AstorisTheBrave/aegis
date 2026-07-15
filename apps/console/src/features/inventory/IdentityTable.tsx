import type { IdentitySummary } from '../../lib/api.js';
import { Box, Check, ChevronDown, ChevronRight, ChevronUp, Cloud } from 'lucide-react';
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

function platformIcon(platformType: string) {
  return platformType.toLowerCase().includes('aws') ? Cloud : Box;
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
            <th className="selection-column" scope="col">
              <span aria-hidden="true" className="table-checkbox" />
            </th>
            <th scope="col">
              <span className="sortable-heading">
                Identity <ChevronUp aria-hidden="true" size={13} />
              </span>
            </th>
            <th scope="col">Source</th>
            <th scope="col">Platform</th>
            <th scope="col">Access Status</th>
            <th scope="col">Privileged Access</th>
            <th scope="col">
              <span className="sortable-heading">
                Last Seen <ChevronDown aria-hidden="true" size={13} />
              </span>
            </th>
            <th aria-label="View details" />
          </tr>
        </thead>
        <tbody>
          {identities.map((identity) => {
            const selected = identity.id === selectedIdentityId;
            const PlatformIcon = platformIcon(identity.platformType);
            return (
              <tr className={selected ? 'is-selected' : undefined} key={identity.id}>
                <td className="selection-column">
                  <button
                    aria-label={`${selected ? 'Deselect' : 'Select'} ${identity.displayName}`}
                    aria-pressed={selected}
                    className="table-checkbox"
                    onClick={() => onSelect(identity)}
                    type="button"
                  >
                    {selected ? <Check aria-hidden="true" size={12} strokeWidth={3} /> : null}
                  </button>
                </td>
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
                  <span className="platform-cell">
                    <PlatformIcon aria-hidden="true" size={17} strokeWidth={2.1} />
                    <span>
                      <strong>{identity.platform}</strong>
                      <small>{identity.platformType}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <span className={`status status-${identity.status}`}>
                    <span aria-hidden="true">●</span> {statusLabel(identity.status)}
                  </span>
                </td>
                <td>
                  <span className={`access-badge ${identity.privileged ? 'is-privileged' : ''}`}>
                    {identity.privileged ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <span className="last-seen">{identity.lastSeen}</span>
                </td>
                <td>
                  <button
                    aria-label="View details"
                    className="identity-details-button"
                    onClick={() => onSelect(identity)}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" size={16} strokeWidth={1.7} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
