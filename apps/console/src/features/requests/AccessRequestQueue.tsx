import type { AccessRequest } from '../../lib/api.js';

export function AccessRequestQueue({
  requests,
  loading,
  onRequest,
  onDecide,
  onActivate,
}: {
  readonly requests: readonly AccessRequest[];
  readonly loading: boolean;
  readonly onRequest: () => Promise<void>;
  readonly onDecide: (request: AccessRequest, approved: boolean) => Promise<void>;
  readonly onActivate: (request: AccessRequest) => Promise<void>;
}) {
  return (
    <section className="discovery-list" aria-labelledby="access-request-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Time-bound access</p>
          <h1 id="access-request-heading">Access requests</h1>
          <p>
            Requests route to the resource owner. Approval is recorded before any simulated
            fulfillment; provider mutation remains disabled.
          </p>
        </div>
        <button className="owner-assignment-button" onClick={() => void onRequest()} type="button">
          Request GitHub access
        </button>
      </div>
      {loading ? <p className="empty-state">Loading access requests…</p> : null}
      {requests.map((request) => (
        <article className="discovery-card action-card" key={request.id}>
          <header>
            <div>
              <p>{request.catalogItem.provider.replace('mock-', 'Mock ')}</p>
              <h2>{request.catalogItem.title}</h2>
              <p>
                {request.requester} · {request.durationMinutes} minutes ·{' '}
                {request.status.replaceAll('_', ' ')}
              </p>
            </div>
            <span className={`action-status action-status-${request.status}`}>
              {request.status}
            </span>
          </header>
          <dl>
            <div>
              <dt>Reason</dt>
              <dd>{request.rationale}</dd>
            </div>
            <div>
              <dt>Review route</dt>
              <dd>{request.catalogItem.reviewer}</dd>
            </div>
            <div>
              <dt>Fulfillment</dt>
              <dd>
                Controlled action required · provider mutation:{' '}
                {String(request.simulatedFulfillment.providerMutation)}
              </dd>
            </div>
          </dl>
          <div className="action-controls">
            {request.status === 'pending' ? (
              <>
                <button onClick={() => void onDecide(request, true)} type="button">
                  Approve
                </button>
                <button onClick={() => void onDecide(request, false)} type="button">
                  Deny
                </button>
              </>
            ) : null}
            {request.status === 'approved' ? (
              <button onClick={() => void onActivate(request)} type="button">
                Record simulated fulfillment
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
