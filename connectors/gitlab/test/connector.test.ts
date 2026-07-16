import { describe, expect, it } from 'vitest';
import { GitLabConnector } from '../src/index.js';
describe('GitLab connector', () =>
  it('keeps provider implementation outside the shared runtime', async () =>
    expect(
      (
        await new GitLabConnector({
          read: async () => ({ identities: [], groups: [], memberships: [] }),
        }).sync({ tenantId: 't', token: 'x' })
      ).connectorId,
    ).toBe('gitlab')));
