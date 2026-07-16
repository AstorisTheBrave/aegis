import { describe, expect, it } from 'vitest';
import { ReadOnlyProviderClient, resolveProviderUrl, retryDirective } from '../src/index.js';

describe('read-only connector runtime', () => {
  it('pins requests to the configured origin and follows pagination', async () => {
    const calls: string[] = [];
    const client = new ReadOnlyProviderClient({
      origin: 'https://api.example.test',
      fetcher: async (input) => {
        calls.push(String(input));
        return new Response(
          JSON.stringify(calls.length === 1 ? [{ id: 'one' }] : [{ id: 'two' }]),
          {
            headers: calls.length === 1 ? { link: '</next>; rel="next"' } : {},
          },
        );
      },
    });
    await expect(client.list('/users')).resolves.toEqual([{ id: 'one' }, { id: 'two' }]);
    expect(calls).toEqual(['https://api.example.test/users', 'https://api.example.test/next']);
    expect(() =>
      resolveProviderUrl(new URL('https://api.example.test'), 'https://evil.test/x'),
    ).toThrow('escaped');
  });

  it('retries only throttled and transient responses', async () => {
    expect(
      retryDirective(new Response('', { status: 429, headers: { 'retry-after': '2' } })),
    ).toEqual({
      reason: 'rate_limit',
      retryAfterMs: 2000,
    });
    expect(retryDirective(new Response('', { status: 403 }))).toBeUndefined();
  });
});
