import type { AssistanceOutput, AssistanceSettings } from '../../lib/api.js';

export function AssistancePanel({
  settings,
  output,
  loading,
  onEnable,
  onGenerate,
}: {
  readonly settings: AssistanceSettings | undefined;
  readonly output: AssistanceOutput | undefined;
  readonly loading: boolean;
  readonly onEnable: () => Promise<void>;
  readonly onGenerate: () => Promise<void>;
}) {
  const enabled = settings?.enabled ?? false;

  return (
    <section className="discovery-list" aria-labelledby="assistance-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Grounded assistance</p>
          <h1 id="assistance-heading">Assistant</h1>
          <p>
            Optional local assistance turns linked facts into review material. It never approves,
            revokes, or executes a provider action.
          </p>
        </div>
        <span className="identity-count">{enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
      {loading ? <p className="empty-state">Loading assistance controls…</p> : null}
      {!loading && !enabled ? (
        <article className="discovery-card action-card">
          <h2>Enable local assistance</h2>
          <p>
            The default local provider uses a per-request budget and retains the source facts in
            every output. Provider credentials and external provider URLs are not accepted.
          </p>
          <div className="action-controls">
            <button onClick={() => void onEnable()} type="button">
              Enable local assistance
            </button>
          </div>
        </article>
      ) : null}
      {!loading && enabled ? (
        <article className="discovery-card action-card">
          <header>
            <div>
              <p>{settings?.allowedProviders.join(', ')}</p>
              <h2>Evidence summary</h2>
              <p>Budget: {settings?.budgetPerRequest} units per request</p>
            </div>
            <span className="action-status action-status-approved">Grounded</span>
          </header>
          <p>Generate a concise draft from the current access inventory.</p>
          <div className="action-controls">
            <button onClick={() => void onGenerate()} type="button">
              Generate evidence summary
            </button>
          </div>
        </article>
      ) : null}
      {output ? (
        <article className="discovery-card action-card" aria-label="Generated assistance output">
          <header>
            <div>
              <p>{output.kind.replaceAll('_', ' ')}</p>
              <h2>Grounded draft</h2>
            </div>
            <span className="action-status action-status-approved">No authority</span>
          </header>
          <p>{output.narrative}</p>
          <dl>
            <div>
              <dt>Source facts</dt>
              <dd>{output.sourceFacts.map((fact) => fact.label).join(', ')}</dd>
            </div>
            <div>
              <dt>Safety boundary</dt>
              <dd>
                Provider mutation: {String(output.providerMutation)} · enforcement:{' '}
                {output.enforcement.replaceAll('_', ' ')}
              </dd>
            </div>
            <div>
              <dt>Prompt and budget</dt>
              <dd>
                {output.promptVersion} · {output.budgetUsed} units · {output.redactionCount}{' '}
                redactions
              </dd>
            </div>
          </dl>
        </article>
      ) : null}
    </section>
  );
}
