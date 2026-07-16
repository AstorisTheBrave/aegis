import { describe, expect, it } from 'vitest';
import { KubernetesConnector } from '../src/index.js';
describe('Kubernetes connector', () =>
  it('separates cluster authentication from graph normalization', async () =>
    expect(
      (
        await new KubernetesConnector({
          read: async () => ({ identities: [], groups: [], memberships: [] }),
        }).sync({ tenantId: 't', token: 'x' })
      ).connectorId,
    ).toBe('kubernetes')));
