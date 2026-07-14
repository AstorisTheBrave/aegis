import type { FindingDetail } from '../../lib/api.js';

export function FindingPanel({ finding }: { readonly finding?: FindingDetail }) {
  if (!finding) {
    return (
      <p className="panel-empty">Select an identity with an open finding to review its evidence.</p>
    );
  }

  return (
    <div className="finding-panel">
      <p className="finding-id">Finding: {finding.id}</p>
      <div className="severity-heading">
        <span className={`severity severity-${finding.severity}`} aria-hidden="true">
          ▲
        </span>
        <div>
          <h2>{finding.title}</h2>
          <span className="open-pill">Open</span>
        </div>
      </div>
      <dl className="finding-facts">
        <div>
          <dt>Identity</dt>
          <dd>{finding.identity}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{finding.source}</dd>
        </div>
        <div>
          <dt>Resource</dt>
          <dd>{finding.resource}</dd>
        </div>
        <div>
          <dt>Access</dt>
          <dd>{finding.access}</dd>
        </div>
        <div>
          <dt>Policy</dt>
          <dd>{finding.policy}</dd>
        </div>
        <div>
          <dt>First seen</dt>
          <dd>{finding.firstSeen}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{finding.lastSeen}</dd>
        </div>
      </dl>
      <section className="evidence-section" aria-labelledby="evidence-heading">
        <div className="section-heading">
          <h3 id="evidence-heading">Evidence</h3>
          <span>{finding.evidence.length}</span>
        </div>
        <p>Collected read-only from the source. Viewing evidence cannot change provider access.</p>
        <ul className="evidence-list">
          {finding.evidence.map((item) => (
            <li key={item.id}>
              <span className="evidence-icon" aria-hidden="true">
                ◇
              </span>
              <span>
                <strong>{item.kind}</strong>
                <span>{item.title}</span>
                <small>{item.detail}</small>
              </span>
              <button aria-label={`View ${item.title} evidence`} type="button">
                ›
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
