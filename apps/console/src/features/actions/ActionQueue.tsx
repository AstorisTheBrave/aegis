import { useState } from 'react';
import type { ControlledAction } from '../../lib/api.js';

export function ActionQueue({
  actions,
  loading,
  onApprove,
  onExecute,
  onCompensate,
}: {
  readonly actions: readonly ControlledAction[];
  readonly loading: boolean;
  readonly onApprove: (action: ControlledAction, breakGlass: boolean) => Promise<void>;
  readonly onExecute: (action: ControlledAction) => Promise<void>;
  readonly onCompensate: (action: ControlledAction) => Promise<void>;
}) {
  const [breakGlass, setBreakGlass] = useState(false);
  return (
    <section className="discovery-list" aria-labelledby="action-queue-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Controlled actions</p>
          <h1 id="action-queue-heading">Approval queue</h1>
          <p>Certified mock providers only. Production provider writes are disabled.</p>
        </div>
        <label className="break-glass-toggle">
          <input
            checked={breakGlass}
            onChange={(event) => setBreakGlass(event.target.checked)}
            type="checkbox"
          />
          Break-glass approval (15 min)
        </label>
      </div>
      {loading ? <p className="empty-state">Loading controlled actions…</p> : null}
      {actions.map((action) => (
        <article className="discovery-card action-card" key={action.id}>
          <header>
            <div>
              <p>{action.provider.replace('mock-', 'Mock ')}</p>
              <h2>{action.kind.replaceAll('_', ' ')}</h2>
              <p>
                {action.target.displayName} · {action.status.replaceAll('_', ' ')}
              </p>
            </div>
            <span className={`action-status action-status-${action.status}`}>{action.status}</span>
          </header>
          <dl>
            <div>
              <dt>Required scopes</dt>
              <dd>{action.requiredScopes.join(', ')}</dd>
            </div>
            <div>
              <dt>Rollback</dt>
              <dd>{action.rollbackNarrative}</dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>
                Requested by {action.requestedBy} · {action.approvals.length} approval(s) ·{' '}
                {action.executions.length} execution event(s)
              </dd>
            </div>
          </dl>
          <div className="action-controls">
            {action.status === 'requested' ? (
              <button onClick={() => void onApprove(action, breakGlass)} type="button">
                {breakGlass ? 'Break-glass approve' : 'Approve'}
              </button>
            ) : null}
            {action.status === 'approved' || action.status === 'failed' ? (
              <button onClick={() => void onExecute(action)} type="button">
                Execute mock action
              </button>
            ) : null}
            {action.status === 'completed' ? (
              <button onClick={() => void onCompensate(action)} type="button">
                Compensate mock action
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
