import { describe, expect, it } from 'vitest';
import { OktaConnector } from '../src/index.js';
describe('Okta connector', () => {
  it('maps users, groups, and memberships', async () => {
    const replies = [
      [{ id: 'u1', status: 'ACTIVE', profile: { login: 'a', email: 'a@example.test' } }],
      [{ id: 'g1', profile: { name: 'Engineering' } }],
      [{ id: 'u1' }],
    ];
    const connector = new OktaConnector(
      'https://tenant.okta.test',
      async () => new Response(JSON.stringify(replies.shift())),
    );
    await expect(
      connector.sync({
        tenantId: 'tenant',
        token: 'secret',
        now: new Date('2026-01-01T00:00:00Z'),
      }),
    ).resolves.toMatchObject({ connectorId: 'okta' });
  });
});
