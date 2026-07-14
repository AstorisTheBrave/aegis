import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const migration = await readFile(
  new URL('../migrations/0001_access_graph.sql', import.meta.url),
  'utf8',
);

describe('0001 access graph migration', () => {
  it('keeps every graph table tenant-scoped and referentially sound', () => {
    for (const table of [
      'governance_identities',
      'governance_resources',
      'governance_entitlements',
      'governance_grants',
      'governance_audit_entries',
    ]) {
      expect(migration).toContain(`CREATE TABLE ${table}`);
    }

    expect(migration).toContain('PRIMARY KEY (tenant_id, id)');
    expect(migration).toContain('PRIMARY KEY (tenant_id, sequence)');
    expect(migration).toContain('DEFERRABLE INITIALLY DEFERRED');
  });
});
