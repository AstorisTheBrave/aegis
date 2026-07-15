import type { SimpleIcon } from 'simple-icons';
import { siGithub, siGitlab, siGoogle, siOkta } from 'simple-icons';

const knownProviders: Readonly<Record<string, SimpleIcon>> = {
  github: siGithub,
  gitlab: siGitlab,
  google: siGoogle,
  'google workspace': siGoogle,
  okta: siOkta,
};

function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase().replaceAll(/[-_]+/g, ' ');
}

export function ProviderLogo({
  provider,
  className = '',
  decorative = false,
}: {
  readonly provider: string;
  readonly className?: string;
  readonly decorative?: boolean;
}) {
  const icon = knownProviders[normalizeProvider(provider)];
  const fallback = provider.trim().slice(0, 1).toUpperCase() || '?';

  if (!icon) {
    return (
      <span
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : provider}
        className={`provider-logo provider-logo-fallback ${className}`.trim()}
        role={decorative ? undefined : 'img'}
        title={decorative ? undefined : provider}
      >
        {fallback}
      </span>
    );
  }

  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : icon.title}
      className={`provider-logo ${className}`.trim()}
      role={decorative ? undefined : 'img'}
      style={{ color: `#${icon.hex}` }}
      title={decorative ? undefined : icon.title}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d={icon.path} fill="currentColor" />
      </svg>
    </span>
  );
}
