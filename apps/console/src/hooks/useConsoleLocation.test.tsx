import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useConsoleLocation } from './useConsoleLocation.js';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useConsoleLocation', () => {
  it('persists meaningful console state in the URL', () => {
    const { result } = renderHook(() => useConsoleLocation());

    act(() => {
      result.current[1]({
        navigation: 'Resources',
        query: 'alice',
        source: 'GitHub',
        platform: 'acme/platform',
        access: 'privileged',
        identityId: 'alice-example',
      });
    });

    expect(window.location.search).toBe(
      '?view=Resources&q=alice&source=GitHub&platform=acme%2Fplatform&access=privileged',
    );
  });
});
