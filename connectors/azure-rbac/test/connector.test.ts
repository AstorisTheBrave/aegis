import { describe, expect, it } from 'vitest';
import { AzureRbacConnector } from '../src/index.js';
describe('Azure RBAC connector', () =>
  it('keeps ARM authentication modular', async () =>
    expect(
      (
        await new AzureRbacConnector({
          read: async () => ({ identities: [], groups: [], memberships: [] }),
        }).sync({ tenantId: 't', token: 'x' })
      ).connectorId,
    ).toBe('azure-rbac')));
