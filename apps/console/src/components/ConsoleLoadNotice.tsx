interface ConsoleLoadNoticeProps {
  readonly message?: string;
  readonly onRetry: () => void;
}

export function ConsoleLoadNotice({ message, onRetry }: ConsoleLoadNoticeProps) {
  if (!message) return null;

  return (
    <section className="console-load-notice" role="alert">
      <div>
        <strong>Some console data could not be refreshed.</strong>
        <p>{message}</p>
      </div>
      <button onClick={onRetry} type="button">
        Retry
      </button>
    </section>
  );
}
