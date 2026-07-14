import { describe, expect, it } from 'vitest';
import { officialConnectorProfiles } from '../src/index.js';

describe('official connector profiles', () => {
  it('names eight read-only integration targets without claiming live certification', () => {
    expect(officialConnectorProfiles).toHaveLength(8);
    expect(new Set(officialConnectorProfiles.map((profile) => profile.id)).size).toBe(8);
    expect(officialConnectorProfiles.every((profile) => profile.status === 'profiled')).toBe(true);
    expect(officialConnectorProfiles.every((profile) => profile.readEndpoints.length > 0)).toBe(
      true,
    );
  });
});
