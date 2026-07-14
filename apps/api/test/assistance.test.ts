import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import { InMemoryAssistanceSettingsRepository } from '@aegis/assistance';
import { AssistanceManager, deterministicLocalProvider } from '../src/assistance.js';
import { createApp } from '../src/app.js';
describe('assistance API', () => {
  it('requires opt-in and produces only cited non-mutating output', async () => {
    const audit = new InMemoryAuditLedger();
    const app = createApp(new InMemoryAccessGraphRepository(), {
      assistance: new AssistanceManager(new InMemoryAssistanceSettingsRepository(), audit),
    });
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/tenants/acme/assistance',
          payload: {
            kind: 'evidence_summary',
            providerId: deterministicLocalProvider,
            actor: 'admin@acme.dev',
            promptVersion: 'v1',
            sourceFacts: [
              {
                id: 'grant:1',
                label: 'GitHub maintain grant',
                observedAt: '2026-07-14T20:00:00.000Z',
              },
            ],
          },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/tenants/acme/assistance/settings',
          payload: {
            enabled: true,
            allowedProviders: [deterministicLocalProvider],
            budgetPerRequest: 400,
            actor: 'admin@acme.dev',
          },
        })
      ).statusCode,
    ).toBe(200);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/tenants/acme/assistance',
      payload: {
        kind: 'evidence_summary',
        providerId: deterministicLocalProvider,
        actor: 'admin@acme.dev',
        promptVersion: 'v1',
        sourceFacts: [
          { id: 'grant:1', label: 'GitHub maintain grant', observedAt: '2026-07-14T20:00:00.000Z' },
        ],
      },
    });
    expect(response.json()).toMatchObject({
      providerMutation: false,
      enforcement: 'not_authorized',
    });
    expect((await audit.list('acme')).map((record) => record.type)).toEqual([
      'assistance.settings_updated',
      'assistance.output_generated',
    ]);
    await app.close();
  });
});
