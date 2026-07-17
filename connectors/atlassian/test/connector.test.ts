import { describe, expect, it } from 'vitest';
import { AtlassianConnector } from '../src/index.js';
describe('Atlassian connector', () =>
  it('maps a source snapshot', async () =>
    expect(
      (
        await new AtlassianConnector({
          read: async () => ({ identities: [], groups: [], memberships: [] }),
        }).sync({ tenantId: 't', token: 'x' })
      ).connectorId,
    ).toBe('atlassian')));
