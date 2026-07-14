import { describe, expect, it } from 'vitest';
import { evaluateAccess } from '../src/index.js';
const access = {
  identity: { id: 'i' },
  grant: { id: 'g' },
  entitlement: { id: 'e', privileged: true },
  resource: { id: 'r' },
} as never;
describe('findings', () =>
  it('emits source-linked privileged-access evidence', () =>
    expect(evaluateAccess([access])).toMatchObject([
      { severity: 'high', evidence: { grantId: 'g' } },
    ])));
