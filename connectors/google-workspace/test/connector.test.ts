import { describe, expect, it } from 'vitest';
import { GoogleWorkspaceConnector } from '../src/index.js';

describe('Google Workspace connector', () => {
  it('maps directory users and group memberships through read-only requests', async () => {
    const replies = [
      { users: [{ id: 'u1', primaryEmail: 'a@example.test', name: { fullName: 'A' } }] },
      { groups: [{ id: 'g1', email: 'admins@example.test', name: 'Admins', adminCreated: true }] },
      { members: [{ id: 'u1', type: 'USER' }] },
    ];
    const connector = new GoogleWorkspaceConnector(
      async () => new Response(JSON.stringify(replies.shift())),
    );
    const batch = await connector.sync({
      tenantId: 'tenant',
      token: 'secret',
      now: new Date('2026-01-01T00:00:00Z'),
    });
    expect(batch.events.map((event) => event.type)).toEqual([
      'identity.upsert',
      'resource.upsert',
      'entitlement.upsert',
      'grant.upsert',
    ]);
  });
});
