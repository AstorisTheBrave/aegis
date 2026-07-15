import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { FindingListItem } from '../../lib/api.js';

interface FindingListProps {
  readonly findings: readonly FindingListItem[];
  readonly selectedFindingId?: string;
  readonly onSelect: (finding: FindingListItem) => void;
}

export function FindingList({ findings, selectedFindingId, onSelect }: FindingListProps) {
  if (!findings.length)
    return <p className="table-state">No findings are open for this workspace.</p>;

  return (
    <div className="finding-list" aria-label="Findings">
      {findings.map((finding) => {
        const selected = finding.id === selectedFindingId;
        return (
          <button
            aria-pressed={selected}
            className={selected ? 'is-selected' : undefined}
            key={finding.id}
            onClick={() => onSelect(finding)}
            type="button"
          >
            <AlertTriangle aria-hidden="true" size={17} strokeWidth={1.8} />
            <span>
              <strong>{finding.title}</strong>
              <small>
                {finding.identity} · {finding.resource} · {finding.lastSeen}
              </small>
            </span>
            <span className={`finding-list-status severity-${finding.severity.toLowerCase()}`}>
              {finding.severity.toLowerCase()}
            </span>
            <ChevronRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
