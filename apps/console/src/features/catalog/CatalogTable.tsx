import type { CatalogApplication, CatalogOwner } from '../../lib/api.js';
import { ProviderLogo } from '../../components/ProviderLogo.js';

interface CatalogTableProps {
  readonly applications: readonly CatalogApplication[];
  readonly loading: boolean;
  readonly onAssignOwners?: (
    applicationId: string,
    owners: readonly CatalogOwner[],
  ) => Promise<void>;
}

export function CatalogTable({ applications, loading, onAssignOwners }: CatalogTableProps) {
  if (loading) return <p className="empty-state">Loading application catalog…</p>;
  if (!applications.length)
    return <p className="empty-state">No catalog applications are recorded.</p>;
  return (
    <div className="catalog-table-wrap">
      <table className="catalog-table">
        <thead>
          <tr>
            <th>Application</th>
            <th>Category</th>
            <th>Risk</th>
            <th>Data</th>
            <th>Owners</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application.id}>
              <td>
                <span className="catalog-application">
                  <ProviderLogo decorative provider={application.vendorName} />
                  <span>
                    <strong>{application.vendorName}</strong>
                    <small>{application.domains.join(', ')}</small>
                  </span>
                </span>
              </td>
              <td>{application.category}</td>
              <td>
                <span className={`risk risk-${application.riskTier}`}>{application.riskTier}</span>
              </td>
              <td>{application.dataClassification}</td>
              <td>
                {application.owners.length ? (
                  application.owners.map((owner) => owner.identityId).join(', ')
                ) : onAssignOwners ? (
                  <form
                    className="owner-assignment"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const ownerIdentity = new FormData(event.currentTarget).get('identityId');
                      if (typeof ownerIdentity !== 'string' || !ownerIdentity.trim()) return;
                      void onAssignOwners(application.id, [
                        {
                          identityId: ownerIdentity.trim(),
                          role: 'business',
                          assignedAt: new Date().toISOString(),
                        },
                      ]);
                      event.currentTarget.reset();
                    }}
                  >
                    <label className="sr-only" htmlFor={`owner-${application.id}`}>
                      Owner identity for {application.vendorName}
                    </label>
                    <input
                      id={`owner-${application.id}`}
                      name="identityId"
                      placeholder="Owner identity"
                    />
                    <button type="submit">Assign</button>
                  </form>
                ) : (
                  'Unassigned'
                )}
              </td>
              <td>{application.recommendation.replace('_', ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
