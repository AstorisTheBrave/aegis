import { Search } from 'lucide-react';
import { navigationItems, type NavigationLabel } from './navigation.js';
import { useModalDialog } from './useModalDialog.js';

interface CommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onNavigate: (navigation: NavigationLabel) => void;
  readonly onFocusSearch: () => void;
  readonly onToggleEvidence: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onFocusSearch,
  onToggleEvidence,
}: CommandPaletteProps) {
  const dialogRef = useModalDialog(open, onClose);
  if (!open) return null;

  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <div className="command-overlay" onMouseDown={onClose} role="presentation">
      <section
        aria-label="Command palette"
        aria-modal="true"
        className="command-palette"
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <header>
          <Search aria-hidden="true" size={15} strokeWidth={1.8} />
          <strong>Jump to</strong>
          <kbd>Esc</kbd>
        </header>
        <div className="command-actions">
          <button onClick={() => run(onFocusSearch)} type="button">
            <span>Focus global search</span>
            <kbd>⌘ K</kbd>
          </button>
          <button onClick={() => run(onToggleEvidence)} type="button">
            <span>Toggle evidence</span>
            <kbd>E</kbd>
          </button>
        </div>
        <div className="command-navigation" aria-label="Navigate to a console area">
          {navigationItems.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => run(() => onNavigate(label))} type="button">
              <Icon aria-hidden="true" size={14} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
