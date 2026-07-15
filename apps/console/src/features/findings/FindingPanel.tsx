import type { FindingDetail } from '../../lib/api.js';
import { Code2, PackageCheck, ShieldAlert } from 'lucide-react';

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
          <ShieldAlert size={34} strokeWidth={1.7} />
        </span>
        <div>
          <h2>{finding.title}</h2>
          <p>Detected 6 hours ago</p>
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
          <dt>Platform</dt>
          <dd>acme/platform (kubernetes)</dd>
        </div>
        <div>
          <dt>Resource</dt>
          <dd>{finding.resource}</dd>
        </div>
        <div>
          <dt>Access</dt>
          <dd>
            <span className="access-level">{finding.access}</span>
          </dd>
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
        <div>
          <dt>Status</dt>
          <dd className="finding-status">
            <span aria-hidden="true">●</span> Requires review
          </dd>
        </div>
      </dl>
      <section className="evidence-section" aria-labelledby="evidence-heading">
        <div className="section-heading">
          <h3 id="evidence-heading">Evidence</h3>
          <span>{finding.evidence.length}</span>
        </div>
        <ul className="evidence-list">
          {finding.evidence.map((item, index) => (
            <li key={item.id}>
              <span className="evidence-icon" aria-hidden="true">
                {index === 0 ? (
                  <Code2 size={15} strokeWidth={1.8} />
                ) : (
                  <PackageCheck size={15} strokeWidth={1.8} />
                )}
              </span>
              <span>
                <strong>{index === 2 ? 'Access Review' : item.kind}</strong>
                <span>{item.title}</span>
                <small>{item.detail}</small>
              </span>
              <button aria-label={`View ${item.title} evidence`} type="button">
                View
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
