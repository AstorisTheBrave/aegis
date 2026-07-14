import type { ReactNode } from 'react';
import {
  Bot,
  Box,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Command,
  GitBranch,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Menu,
  Network,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  Workflow,
} from 'lucide-react';

const navigation = [
  { label: 'Inventory', icon: LayoutDashboard },
  { label: 'Findings', icon: ShieldCheck },
  { label: 'Reviews', icon: ClipboardCheck },
  { label: 'Access', icon: KeyRound },
  { label: 'Identities', icon: UsersRound },
  { label: 'Resources', icon: Box },
  { label: 'Policies', icon: ListChecks },
  { label: 'Workflows', icon: Workflow },
  { label: 'Actions', icon: GitBranch },
  { label: 'Assistant', icon: Bot },
  { label: 'Controls', icon: SlidersHorizontal },
  { label: 'Connectors', icon: Network },
  { label: 'Settings', icon: Settings },
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
  const breadcrumb =
    activeNavigation === 'Inventory'
      ? { section: 'Inventory', page: 'Identities' }
      : { section: 'Workspace', page: activeNavigation };

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
          <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
        </button>
        <nav>
          {navigation.map(({ label, icon: Icon }) => (
            <button
              aria-current={label === activeNavigation ? 'page' : undefined}
              className={`navigation-item ${label === activeNavigation ? 'is-active' : ''}`}
              key={label}
              onClick={() => onNavigate?.(label)}
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
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search identities, resources, roles..."
              value={search}
            />
          </label>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Open command palette">
              <Command aria-hidden="true" size={15} strokeWidth={1.8} />
            </button>
            <button className="icon-button" type="button" aria-label="Open help">
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
    </main>
  );
}
