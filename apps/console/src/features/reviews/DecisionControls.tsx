import { useState } from 'react';
import { ShieldCheck, ShieldMinus, ShieldX } from 'lucide-react';
import type { ReviewDecision } from '../../lib/api.js';

const options: ReadonlyArray<{
  value: ReviewDecision;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  { value: 'approved', label: 'Approve', description: 'Access is valid', icon: ShieldCheck },
  { value: 'needs_information', label: 'Maintain', description: 'Keep for now', icon: ShieldMinus },
  { value: 'revocation_requested', label: 'Revoke', description: 'Remove access', icon: ShieldX },
];

interface DecisionControlsProps {
  readonly disabled?: boolean;
  readonly onSubmit: (input: { decision: ReviewDecision; comment: string }) => Promise<void>;
}

export function DecisionControls({ disabled = false, onSubmit }: DecisionControlsProps) {
  const [decision, setDecision] = useState<ReviewDecision>('needs_information');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setSubmitting(true);
    setSuccess('');
    setError('');
    try {
      await onSubmit({ decision, comment });
      setSuccess('Decision recorded in Aegis. No provider access was changed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record the decision.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="review-controls" aria-labelledby="review-heading">
      <h3 id="review-heading">Access Review Decision</h3>
      <div className="decision-options" role="group" aria-label="Access review decision">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              aria-pressed={decision === option.value}
              className={decision === option.value ? 'is-chosen' : undefined}
              disabled={disabled || submitting}
              key={option.value}
              onClick={() => setDecision(option.value)}
              type="button"
            >
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </button>
          );
        })}
      </div>
      {decision === 'revocation_requested' ? (
        <p className="non-mutating-notice">
          Revoke creates a non-mutating removal request. It does not change the provider.
        </p>
      ) : null}
      <label className="comment-field">
        <span>Optional comment</span>
        <textarea
          aria-label="Decision comment"
          disabled={disabled || submitting}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add a comment (optional)..."
          value={comment}
        />
      </label>
      <button
        className="submit-decision"
        disabled={disabled || submitting}
        onClick={submit}
        type="button"
      >
        {submitting ? 'Recording…' : 'Submit decision'}
      </button>
      {success ? (
        <p className="decision-success" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="decision-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
