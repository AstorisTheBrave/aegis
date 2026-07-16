import { describe, expect, it } from 'vitest';
import { officialConnectorProfiles } from '../src/index.js';

describe('official connector profiles', () => {
  it('names twelve read-only integration targets without claiming live certification', () => {
    expect(officialConnectorProfiles).toHaveLength(12);
    expect(new Set(officialConnectorProfiles.map((profile) => profile.id)).size).toBe(12);
    expect(officialConnectorProfiles.every((profile) => profile.status === 'profiled')).toBe(true);
    expect(officialConnectorProfiles.every((profile) => profile.readEndpoints.length > 0)).toBe(
      true,
    );
  });
});
