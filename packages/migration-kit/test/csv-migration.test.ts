import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { createAccessCsvBatch, CsvMigrationError } from '../src/index.js';

const input = {
  tenantId: 'acme',
  connectorId: 'csv-import',
  sourceReference: 'exports/access.csv',
  observedAt: '2026-07-14T20:00:00.000Z',
  csv: readFileSync(
    new URL('../../../fixtures/benchmark/access-export.v1.csv', import.meta.url),
    'utf8',
  ),
};

describe('CSV migration kit', () => {
  it('creates a deterministic, dependency-ordered graph batch from a quoted access export', async () => {
    const batch = createAccessCsvBatch(input);
    expect(batch.events).toHaveLength(4);
    expect(batch.events.map((event) => event.type)).toEqual([
      'identity.upsert',
      'resource.upsert',
      'entitlement.upsert',
      'grant.upsert',
    ]);
    await expect(new InMemoryAccessGraphRepository().applySync(batch)).resolves.toBeUndefined();
    expect(JSON.stringify(batch)).not.toContain('credential');
  });

  it('rejects incomplete exports without returning a partial batch', () => {
    expect(() =>
      createAccessCsvBatch({ ...input, csv: 'identity_id,identity_name\nalice,Alice' }),
    ).toThrow(CsvMigrationError);
    expect(() =>
      createAccessCsvBatch({
        ...input,
        csv: 'identity_id,identity_name,provider,resource_id,resource_name,entitlement\nalice,,github,repo,Platform,read',
      }),
    ).toThrow('Row 2');
  });
});
