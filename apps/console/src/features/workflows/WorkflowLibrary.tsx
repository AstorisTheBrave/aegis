import type { WorkflowDefinition, WorkflowExecution } from '../../lib/api.js';

export function WorkflowLibrary({
  templates,
  execution,
  loading,
  onRun,
  onRequestOffboarding,
}: {
  readonly templates: readonly WorkflowDefinition[];
  readonly execution?: WorkflowExecution;
  readonly loading: boolean;
  readonly onRun: (templateId: string) => Promise<void>;
  readonly onRequestOffboarding?: (execution: WorkflowExecution) => Promise<void>;
}) {
  return (
    <section className="discovery-list" aria-labelledby="workflow-library-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Dry-run workflows</p>
          <h1 id="workflow-library-heading">Lifecycle workflow library</h1>
          <p>
            Every provider call is previewed with scopes and rollback context before any future
            action.
          </p>
        </div>
      </div>
      {loading ? <p className="empty-state">Loading workflow templates…</p> : null}
      {templates.map((template) => (
        <article className="discovery-card" key={template.id}>
          <header>
            <div>
              <p>{template.trigger.replace('_', ' ')}</p>
              <h2>{template.title}</h2>
              <p>{template.version}</p>
            </div>
            <button
              className="owner-assignment-button"
              onClick={() => void onRun(template.id)}
              type="button"
            >
              Preview dry run
            </button>
          </header>
          <div className="reason-list">
            {template.steps.map((step) => (
              <span key={step.id}>{step.title}</span>
            ))}
          </div>
        </article>
      ))}
      {execution ? (
        <article className="discovery-card" aria-label="Dry-run preview">
          <header>
            <div>
              <p>Execution {execution.id}</p>
              <h2>{execution.status.replace('_', ' ')}</h2>
              <p>Provider mutation: false</p>
            </div>
          </header>
          <dl>
            {execution.preview.map((step) => (
              <div key={step.stepId}>
                <dt>{step.title}</dt>
                <dd>
                  {step.status.replace('_', ' ')} ·{' '}
                  {step.requiredScopes.join(', ') || 'No provider scope'}
                </dd>
              </div>
            ))}
          </dl>
          {execution.definitionId === 'leaver.v1' ? (
            <button
              className="owner-assignment-button"
              onClick={() => void onRequestOffboarding?.(execution)}
              type="button"
            >
              Create controlled action requests
            </button>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
