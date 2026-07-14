import { describe, expect, it } from 'vitest';
import { GitHubConnector } from '../src/index.js';

describe('GitHubConnector', () => {
  it('normalizes organization admins, outside collaborators, teams, and direct repository grants', async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method });
      const headers = new Headers();
      let data: unknown[] = [];
      if (url.includes('/members?role=admin')) {
        data = [{ id: 2, login: 'bob', type: 'Bot' }];
      } else if (url.includes('/outside_collaborators')) {
        data = [{ id: 3, login: 'carol', type: 'User' }];
      } else if (url.includes('/teams?')) {
        data = [{ id: 10, slug: 'platform', name: 'Platform' }];
      } else if (url.includes('/teams/platform/members')) {
        data = [{ id: 1, login: 'alice', type: 'User', role: 'member', inherited: false }];
      } else if (url.includes('/teams/platform/repos')) {
        data = [
          {
            id: 20,
            full_name: 'acme/aegis',
            private: true,
            archived: false,
            permissions: { admin: true },
          },
        ];
      } else if (url.includes('/repos?')) {
        data = [
          {
            id: 20,
            full_name: 'acme/aegis',
            private: true,
            archived: false,
            html_url: 'https://github.com/acme/aegis',
            owner: { login: 'acme' },
          },
        ];
      } else if (url.includes('/collaborators')) {
        data = [{ id: 3, login: 'carol', type: 'User', role_name: 'maintain' }];
      } else if (url.includes('/members?per_page=100&page=2')) {
        data = [];
      } else if (url.includes('/members?')) {
        data = [{ id: 1, login: 'alice', type: 'User' }];
        headers.set(
          'link',
          '<https://api.github.com/orgs/acme/members?per_page=100&page=2>; rel="next"',
        );
      }
      return new Response(JSON.stringify(data), { headers });
    }) as typeof fetch;

    const batch = await new GitHubConnector(fetcher).sync({
      tenantId: 't',
      organization: 'acme',
      token: 'x',
      now: new Date('2026-07-14T00:00:00Z'),
    });

    expect(batch.events).toContainEqual(
      expect.objectContaining({
        type: 'identity.upsert',
        entity: expect.objectContaining({
          id: 'github:user:3',
          attributes: expect.objectContaining({ outsideCollaborator: true }),
        }),
      }),
    );
    expect(batch.events).toContainEqual(
      expect.objectContaining({
        type: 'identity.upsert',
        entity: expect.objectContaining({ id: 'github:user:2', identityType: 'bot' }),
      }),
    );
    expect(batch.events).toContainEqual(
      expect.objectContaining({
        type: 'grant.upsert',
        entity: expect.objectContaining({
          identityId: 'github:user:2',
          entitlementId: 'github:org:acme:role:admin',
          grantType: 'DIRECT',
        }),
      }),
    );
    expect(batch.events).toContainEqual(
      expect.objectContaining({
        type: 'grant.upsert',
        entity: expect.objectContaining({
          identityId: 'github:user:1',
          entitlementId: 'github:repo:20:role:admin',
          grantType: 'GROUP',
        }),
      }),
    );
    expect(batch.events).toContainEqual(
      expect.objectContaining({
        type: 'grant.upsert',
        entity: expect.objectContaining({
          identityId: 'github:user:3',
          entitlementId: 'github:repo:20:role:maintain',
          grantType: 'DIRECT',
        }),
      }),
    );
    expect(calls.some((call) => call.url.includes('page=2'))).toBe(true);
    expect(calls.some((call) => call.url.includes('collaborators?affiliation=direct'))).toBe(true);
    expect(calls.every((call) => call.method === undefined || call.method === 'GET')).toBe(true);
  });
});
