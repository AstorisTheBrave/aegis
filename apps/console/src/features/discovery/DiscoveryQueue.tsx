import type { DiscoveryQueueItem } from '../../lib/api.js';
import { ProviderLogo } from '../../components/ProviderLogo.js';

interface DiscoveryQueueProps {
  readonly items: readonly DiscoveryQueueItem[];
  readonly loading: boolean;
}

function label(value: string): string {
  return value.replaceAll('_', ' ');
}

export function DiscoveryQueue({ items, loading }: DiscoveryQueueProps) {
  if (loading) return <p className="empty-state">Loading discovery evidence…</p>;
  if (!items.length) return <p className="empty-state">No discovery observations need review.</p>;
  return (
    <div className="discovery-list" aria-label="Discovery review queue">
      {items.map((item) => (
        <article
          className="discovery-card"
          key={`${item.observation.source}:${item.observation.id}`}
        >
          <header>
            <div>
              <p className="eyebrow discovery-source">
                <ProviderLogo decorative provider={item.observation.source} />
                {label(item.observation.source)}
              </p>
              <h2>{item.observation.vendorName}</h2>
              <p>{item.application ? 'Matched catalog application' : 'Unmatched observation'}</p>
            </div>
            <span className={`recommendation recommendation-${item.recommendation}`}>
              {label(item.recommendation)}
            </span>
          </header>
          <dl>
            <div>
              <dt>Identity</dt>
              <dd>{item.observation.identityType ?? 'human'}</dd>
            </div>
            <div>
              <dt>Activity</dt>
              <dd>{item.usage.activityCount} observed events</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{item.observation.sourceReference}</dd>
            </div>
          </dl>
          <div className="reason-list" aria-label="Review reasons">
            {item.reasons.map((reason) => (
              <span key={reason}>{label(reason)}</span>
            ))}
          </div>
          <p className="read-only-note">
            Recommendation only — source systems are never changed here.
          </p>
        </article>
      ))}
    </div>
  );
}
