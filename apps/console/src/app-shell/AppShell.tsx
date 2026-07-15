import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Command, HelpCircle, Menu, Search } from 'lucide-react';
import { CommandPalette } from './CommandPalette.js';
import { ConsoleHelp } from './ConsoleHelp.js';
import { navigationItems, type NavigationLabel } from './navigation.js';

interface AppShellProps {
  readonly children: ReactNode;
  readonly evidence: ReactNode;
  readonly navigationOpen: boolean;
  readonly onNavigationToggle: () => void;
  readonly evidenceOpen: boolean;
  readonly onEvidenceToggle: () => void;
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly activeNavigation?: NavigationLabel;
  readonly onNavigate?: (label: NavigationLabel) => void;
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
  const searchInput = useRef<HTMLInputElement>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const breadcrumb =
    activeNavigation === 'Inventory'
      ? { section: 'Inventory', page: 'Identities' }
      : { section: 'Workspace', page: activeNavigation };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCommandPaletteOpen(false);
        setHelpOpen(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (event.key === '?' && !event.metaKey && !event.ctrlKey) setHelpOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function navigate(label: NavigationLabel) {
    onNavigate?.(label);
    if (navigationOpen) onNavigationToggle();
  }

  function focusSearch() {
    searchInput.current?.focus();
  }

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
        <div className="environment-switcher" aria-label="Current environment">
          <span>acme/platform</span>
          <small>Environment</small>
          <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
        </div>
        <nav>
          {navigationItems.map(({ label, icon: Icon }) => (
            <button
              aria-current={label === activeNavigation ? 'page' : undefined}
              className={`navigation-item ${label === activeNavigation ? 'is-active' : ''}`}
              key={label}
              onClick={() => navigate(label)}
              type="button"
            >
              <span className="navigation-glyph" aria-hidden="true">
                <Icon size={13} strokeWidth={1.7} />
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
              <Menu aria-hidden="true" size={18} />
            </button>
            <span>{breadcrumb.section}</span>
            <ChevronRight aria-hidden="true" size={14} />
            <strong>{breadcrumb.page}</strong>
          </div>
          <label className="global-search">
            <span className="sr-only">Search identities, resources, roles</span>
            <Search aria-hidden="true" size={14} strokeWidth={1.8} />
            <input
              ref={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search identities, resources, roles..."
              value={search}
            />
          </label>
          <div className="topbar-actions">
            <button
              aria-label="Open command palette"
              className="icon-button"
              onClick={() => setCommandPaletteOpen(true)}
              type="button"
            >
              <Command aria-hidden="true" size={15} strokeWidth={1.8} />
            </button>
            <button
              aria-label="Open help"
              className="icon-button"
              onClick={() => setHelpOpen(true)}
              type="button"
            >
              <HelpCircle aria-hidden="true" size={16} strokeWidth={1.8} />
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
      <CommandPalette
        onClose={() => setCommandPaletteOpen(false)}
        onFocusSearch={focusSearch}
        onNavigate={navigate}
        onToggleEvidence={onEvidenceToggle}
        open={commandPaletteOpen}
      />
      <ConsoleHelp onClose={() => setHelpOpen(false)} open={helpOpen} />
    </main>
  );
}
