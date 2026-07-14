import type { PolicyEvaluation } from '../../lib/api.js';

export function PolicyQueue({
  evaluations,
  loading,
  onRunReview,
}: {
  readonly evaluations: readonly PolicyEvaluation[];
  readonly loading: boolean;
  readonly onRunReview: (policyIds: readonly PolicyEvaluation['policyId'][]) => Promise<void>;
}) {
  const required = evaluations.filter(
    (evaluation) => evaluation.recommendation === 'review_required',
  );
  return (
    <section className="discovery-list" aria-labelledby="policy-queue-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Versioned policy queue</p>
          <h1 id="policy-queue-heading">Review recommendations</h1>
          <p>Source-linked evidence only. Running a review never changes a provider.</p>
        </div>
        <button
          className="owner-assignment-button"
          disabled={!required.length || loading}
          onClick={() => void onRunReview([...new Set(required.map((item) => item.policyId))])}
          type="button"
        >
          Run policy review
        </button>
      </div>
      {loading ? <p className="empty-state">Loading policy evidence…</p> : null}
      {!loading && !required.length ? (
        <p className="empty-state">No policy reviews are required.</p>
      ) : null}
      {required.map((evaluation) => (
        <article className="discovery-card" key={`${evaluation.policyId}:${evaluation.subject.id}`}>
          <header>
            <div>
              <p>{evaluation.policyId}</p>
              <h2>{evaluation.subject.displayName}</h2>
              <p>{evaluation.subject.kind.replace('_', ' ')}</p>
            </div>
            <span className="recommendation">{evaluation.recommendation.replace('_', ' ')}</span>
          </header>
          <dl>
            <div>
              <dt>Owner route</dt>
              <dd>{evaluation.subject.owners.join(', ') || 'Unassigned'}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{evaluation.evidence.map((item) => item.sourceReference).join(', ')}</dd>
            </div>
            <div>
              <dt>Observed</dt>
              <dd>{evaluation.evidence.map((item) => item.observedAt).join(', ')}</dd>
            </div>
          </dl>
          <div className="reason-list">
            {evaluation.reasons.map((reason) => (
              <span key={reason}>{reason.replaceAll('_', ' ')}</span>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
