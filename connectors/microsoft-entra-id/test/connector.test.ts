import { describe, expect, it } from 'vitest';
import { MicrosoftEntraIdConnector } from '../src/index.js';
describe('Microsoft Entra ID connector', () => {
  it('retains inherited group provenance', async () => {
    const replies = [
      { value: [{ id: 'u1', displayName: 'A', accountEnabled: true }] },
      { value: [{ id: 'g1', displayName: 'Privileged', isAssignableToRole: true }] },
      { value: [{ id: 'u1', '@odata.type': '#microsoft.graph.user' }] },
    ];
    const connector = new MicrosoftEntraIdConnector(
      async () => new Response(JSON.stringify(replies.shift())),
    );
    const batch = await connector.sync({
      tenantId: 'tenant',
      token: 'secret',
      now: new Date('2026-01-01T00:00:00Z'),
    });
    expect(batch.events.at(-1)).toMatchObject({ entity: { grantType: 'INHERITED' } });
  });
});
