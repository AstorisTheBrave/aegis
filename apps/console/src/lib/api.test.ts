import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpApi } from './api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createHttpApi', () => {
  it('maps console campaign decisions to the API kind field', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'campaign:1',
          title: 'Review',
          createdAt: '',
          status: 'open',
          tasks: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetcher);

    await createHttpApi('https://aegis.example').recordCampaignDecision(
      'acme',
      'campaign:1',
      'task:1',
      { decision: 'retain', reviewer: 'owner@acme.dev', rationale: 'Verified.' },
    );

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      decision: 'retain',
      kind: 'retain',
    });
  });
});
