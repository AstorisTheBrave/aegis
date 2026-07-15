import { Search, SlidersHorizontal } from 'lucide-react';
import type { AccessFilter } from '../../hooks/useConsoleLocation.js';

interface IdentityFiltersProps {
  readonly search: string;
  readonly source: string;
  readonly platform: string;
  readonly access: AccessFilter;
  readonly sources: readonly string[];
  readonly platforms: readonly string[];
  readonly onSearchChange: (value: string) => void;
  readonly onSourceChange: (value: string) => void;
  readonly onPlatformChange: (value: string) => void;
  readonly onAccessChange: (value: AccessFilter) => void;
  readonly onClear: () => void;
}

export function IdentityFilters({
  search,
  source,
  platform,
  access,
  sources,
  platforms,
  onSearchChange,
  onSourceChange,
  onPlatformChange,
  onAccessChange,
  onClear,
}: IdentityFiltersProps) {
  const activeCount =
    Number(Boolean(search)) +
    Number(Boolean(source)) +
    Number(Boolean(platform)) +
    Number(access !== 'all');

  return (
    <div className="filters" aria-label="Identity filters">
      <label className="filter-search">
        <Search aria-hidden="true" size={13} strokeWidth={1.8} />
        <span className="sr-only">Search identities</span>
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search people..."
          value={search}
        />
      </label>
      <label className="filter-select">
        <span className="sr-only">Source</span>
        <select onChange={(event) => onSourceChange(event.target.value)} value={source}>
          <option value="">All sources</option>
          {sources.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-select">
        <span className="sr-only">Platform</span>
        <select onChange={(event) => onPlatformChange(event.target.value)} value={platform}>
          <option value="">All platforms</option>
          {platforms.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-select">
        <span className="sr-only">Access</span>
        <select
          onChange={(event) => onAccessChange(event.target.value as AccessFilter)}
          value={access}
        >
          <option value="all">Access: all</option>
          <option value="privileged">Privileged only</option>
          <option value="requires_review">Requires review</option>
        </select>
      </label>
      <button disabled={!activeCount} onClick={onClear} type="button">
        <SlidersHorizontal aria-hidden="true" size={13} strokeWidth={1.8} />
        {activeCount ? `Clear filters (${activeCount})` : 'Filters'}
      </button>
    </div>
  );
}
