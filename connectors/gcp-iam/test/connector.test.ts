import { describe, expect, it } from 'vitest';
import { GcpIamConnector } from '../src/index.js';
describe('GCP IAM connector', () =>
  it('accepts a provider-specific read-only source', async () =>
    expect(
      (
        await new GcpIamConnector({
          read: async () => ({ identities: [], groups: [], memberships: [] }),
        }).sync({ tenantId: 't', token: 'x' })
      ).connectorId,
    ).toBe('gcp-iam')));
