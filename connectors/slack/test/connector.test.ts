import { describe, expect, it } from 'vitest';
import { SlackConnector } from '../src/index.js';
describe('Slack connector', () =>
  it('accepts a read-only provider source', async () =>
    expect(
      (
        await new SlackConnector({
          read: async () => ({ identities: [], groups: [], memberships: [] }),
        }).sync({ tenantId: 't', token: 'x' })
      ).connectorId,
    ).toBe('slack')));
