import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { isNavigationLabel, type NavigationLabel } from '../app-shell/navigation.js';

export type AccessFilter = 'all' | 'privileged' | 'requires_review';

export interface ConsoleLocation {
  readonly navigation: NavigationLabel;
  readonly query: string;
  readonly source: string;
  readonly platform: string;
  readonly access: AccessFilter;
  readonly identityId: string;
}

const defaults: ConsoleLocation = {
  navigation: 'Inventory',
  query: '',
  source: '',
  platform: '',
  access: 'all',
  identityId: 'alice-example',
};

function readLocation(search = window.location.search): ConsoleLocation {
  const params = new URLSearchParams(search);
  const navigation = params.get('view');
  const access = params.get('access');

  return {
    navigation: isNavigationLabel(navigation) ? navigation : defaults.navigation,
    query: params.get('q') ?? defaults.query,
    source: params.get('source') ?? defaults.source,
    platform: params.get('platform') ?? defaults.platform,
    access:
      access === 'privileged' || access === 'requires_review' || access === 'all'
        ? access
        : defaults.access,
    identityId: params.get('identity') ?? defaults.identityId,
  };
}

function writeLocation(location: ConsoleLocation): void {
  const params = new URLSearchParams();
  if (location.navigation !== defaults.navigation) params.set('view', location.navigation);
  if (location.query) params.set('q', location.query);
  if (location.source) params.set('source', location.source);
  if (location.platform) params.set('platform', location.platform);
  if (location.access !== defaults.access) params.set('access', location.access);
  if (location.identityId !== defaults.identityId) params.set('identity', location.identityId);
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

export function useConsoleLocation(): readonly [
  ConsoleLocation,
  Dispatch<SetStateAction<ConsoleLocation>>,
] {
  const [location, setLocation] = useState<ConsoleLocation>(() => readLocation());

  useEffect(() => {
    writeLocation(location);
  }, [location]);

  useEffect(() => {
    const onPopState = () => setLocation(readLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return [location, setLocation] as const;
}
