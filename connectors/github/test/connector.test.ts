import { describe, expect, it } from 'vitest';

import { GitHubConnector } from '../src/index.js';

describe('GitHubConnector', () => {
  it('normalizes a read-only repository grant', async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      const data = url.includes('/members')
        ? [{ id: 1, login: 'alice', type: 'User' }]
        : url.includes('/repos?')
          ? [{ id: 2, full_name: 'acme/aegis', private: true, archived: false }]
          : [{ id: 1, login: 'alice', type: 'User', role_name: 'maintain' }];
      return new Response(JSON.stringify(data));
    }) as typeof fetch;

    const batch = await new GitHubConnector(fetcher).sync({
      tenantId: 't',
      organization: 'acme',
      token: 'x',
      now: new Date('2026-07-14T00:00:00Z'),
    });
    expect(batch.events.some((event) => event.type === 'grant.upsert')).toBe(true);
    expect(calls).toHaveLength(3);
  });
});
