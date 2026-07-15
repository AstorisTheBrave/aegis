interface WorkspacePlaceholderProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly nextStep: string;
}

export function WorkspacePlaceholder({
  eyebrow,
  title,
  description,
  nextStep,
}: WorkspacePlaceholderProps) {
  return (
    <div className="workspace-placeholder">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="workspace-placeholder-next">
        <strong>Next:</strong> {nextStep}
      </p>
    </div>
  );
}
