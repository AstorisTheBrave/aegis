import { describe, expect, it } from 'vitest';
import { ScimConnector } from '../src/index.js';
describe('SCIM connector', () =>
  it('maps a read-only snapshot', async () =>
    expect(
      (
        await new ScimConnector({
          read: async () => ({ identities: [], groups: [], memberships: [] }),
        }).sync({ tenantId: 't', token: 'x' })
      ).connectorId,
    ).toBe('scim-2')));
