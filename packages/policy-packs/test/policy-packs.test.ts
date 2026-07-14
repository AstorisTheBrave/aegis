import { describe, expect, it } from 'vitest';
import { communityPolicyPacks } from '../src/index.js';

describe('community policy packs', () => {
  it('ships five versioned deterministic packs with unique source-linked rules', () => {
    expect(communityPolicyPacks).toHaveLength(5);
    const rules = communityPolicyPacks.flatMap((pack) => pack.contribution.rules);
    expect(new Set(rules.map((rule) => rule.id)).size).toBe(rules.length);
    expect(rules.every((rule) => rule.requiredSourceFacts.length > 0)).toBe(true);
    expect(communityPolicyPacks.every((pack) => pack.version === '1.0.0')).toBe(true);
  });
});
