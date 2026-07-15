import { useModalDialog } from './useModalDialog.js';

interface ConsoleHelpProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function ConsoleHelp({ open, onClose }: ConsoleHelpProps) {
  const dialogRef = useModalDialog(open, onClose);
  if (!open) return null;

  return (
    <div className="command-overlay" onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby="console-help-title"
        aria-modal="true"
        className="console-help"
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <header>
          <div>
            <p className="eyebrow">Aegis console</p>
            <h2 id="console-help-title">Quick help</h2>
          </div>
          <button onClick={onClose} type="button">
            Close
          </button>
        </header>
        <dl>
          <div>
            <dt>⌘ K</dt>
            <dd>Open the command palette and move between console areas.</dd>
          </div>
          <div>
            <dt>?</dt>
            <dd>Open this guide.</dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>
              Identity selection only changes the review context; no source access changes occur.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
