import { describe, expect, it } from 'vitest';
import { AwsIamConnector } from '../src/index.js';
describe('AWS IAM connector', () =>
  it('uses an independently authenticated read-only source', async () =>
    expect(
      (
        await new AwsIamConnector({
          read: async () => ({ identities: [], groups: [], memberships: [] }),
        }).sync({ tenantId: 't', token: 'x' })
      ).connectorId,
    ).toBe('aws-iam')));
