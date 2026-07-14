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

  it('loads test-tenant activations from the control-plane endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'test-activation:1',
            provider: 'mock-okta',
            environment: 'test',
            allowedActionKinds: ['disable_account'],
            grantedScopes: ['users.disable'],
            activatedBy: 'operator@acme.dev',
            activatedAt: '2026-07-14T18:00:00.000Z',
            expiresAt: '2026-07-15T18:00:00.000Z',
          },
        ]),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetcher);

    await expect(
      createHttpApi('https://aegis.example').listTestActivations('acme'),
    ).resolves.toHaveLength(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://aegis.example/v1/tenants/acme/test-activations',
    );
  });
});
