import type { ReactNode } from 'react';

const navigation = [
  'Inventory',
  'Findings',
  'Reviews',
  'Access',
  'Identities',
  'Resources',
  'Policies',
  'Workflows',
  'Actions',
  'Assistant',
  'Controls',
  'Connectors',
  'Settings',
];

interface AppShellProps {
  readonly children: ReactNode;
  readonly evidence: ReactNode;
  readonly navigationOpen: boolean;
  readonly onNavigationToggle: () => void;
  readonly evidenceOpen: boolean;
  readonly onEvidenceToggle: () => void;
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly activeNavigation?: string;
  readonly onNavigate?: (label: string) => void;
}

export function AppShell({
  children,
  evidence,
  navigationOpen,
  onNavigationToggle,
  evidenceOpen,
  onEvidenceToggle,
  search,
  onSearchChange,
  activeNavigation = 'Inventory',
  onNavigate,
}: AppShellProps) {
  return (
    <main className={`app-shell ${navigationOpen ? 'navigation-open' : ''}`}>
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <span className="shield-mark" aria-hidden="true">
            A
          </span>
          <span>
            <strong>Aegis</strong>
            <small>self-hosted</small>
          </span>
        </div>
        <button className="environment-switcher" type="button">
          <span>acme/platform</span>
          <small>Environment</small>
          <span aria-hidden="true">⌄</span>
        </button>
        <nav>
          {navigation.map((label) => (
            <button
              aria-current={label === activeNavigation ? 'page' : undefined}
              className={`navigation-item ${label === activeNavigation ? 'is-active' : ''}`}
              key={label}
              onClick={() => onNavigate?.(label)}
              type="button"
            >
              <span className="navigation-glyph" aria-hidden="true">
                {label.slice(0, 1)}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="admin-avatar">AE</span>
          <span>
            <strong>Aegis Admin</strong>
            <small>Administrator</small>
          </span>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              aria-label="Toggle navigation"
              className="icon-button navigation-toggle"
              onClick={onNavigationToggle}
              type="button"
            >
              ☰
            </button>
            <span>Inventory</span>
            <span aria-hidden="true">›</span>
            <strong>Identities</strong>
          </div>
          <label className="global-search">
            <span className="sr-only">Search identities, resources, roles</span>
            <span aria-hidden="true">⌕</span>
            <input
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search identities, resources, roles..."
              value={search}
            />
          </label>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Open command palette">
              ›_
            </button>
            <button className="icon-button" type="button" aria-label="Open help">
              ?
            </button>
            <span className="topbar-avatar">AE</span>
          </div>
        </header>
        {children}
      </section>
      <aside
        className={`evidence-rail ${evidenceOpen ? 'is-open' : ''}`}
        aria-label="Finding evidence"
      >
        <button className="evidence-close" onClick={onEvidenceToggle} type="button">
          Close
        </button>
        {evidence}
      </aside>
      <button className="evidence-toggle" onClick={onEvidenceToggle} type="button">
        {evidenceOpen ? 'Hide evidence' : 'Show evidence'}
      </button>
    </main>
  );
}
