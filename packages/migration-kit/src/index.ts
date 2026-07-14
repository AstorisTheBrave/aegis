import type { GraphSyncBatch, GraphSyncEvent } from '@open-saas-governance/access-graph';

const requiredColumns = [
  'identity_id',
  'identity_name',
  'provider',
  'resource_id',
  'resource_name',
  'entitlement',
] as const;

export class CsvMigrationError extends Error {
  constructor(readonly errors: readonly string[]) {
    super(`CSV migration validation failed: ${errors.join('; ')}`);
  }
}

export function createAccessCsvBatch(input: {
  readonly tenantId: string;
  readonly connectorId: string;
  readonly sourceReference: string;
  readonly observedAt: string;
  readonly csv: string;
}): GraphSyncBatch {
  if (!input.tenantId.trim() || !input.connectorId.trim() || !input.sourceReference.trim()) {
    throw new CsvMigrationError(['tenantId, connectorId, and sourceReference are required']);
  }
  if (Number.isNaN(new Date(input.observedAt).valueOf())) {
    throw new CsvMigrationError(['observedAt must be a valid timestamp']);
  }
  const rows = parseCsv(input.csv);
  const header = rows.shift();
  if (!header) throw new CsvMigrationError(['CSV is empty']);
  const positions = new Map(header.map((column, index) => [column.trim(), index]));
  const missing = requiredColumns.filter((column) => !positions.has(column));
  if (missing.length)
    throw new CsvMigrationError([`Missing required columns: ${missing.join(', ')}`]);

  const errors: string[] = [];
  const normalized = rows.map((row, index) => {
    const values = Object.fromEntries(
      requiredColumns.map((column) => [column, row[positions.get(column)!]?.trim() ?? '']),
    ) as Record<(typeof requiredColumns)[number], string>;
    const blanks = requiredColumns.filter((column) => !values[column]);
    if (blanks.length) errors.push(`Row ${index + 2}: missing ${blanks.join(', ')}`);
    return values;
  });
  if (errors.length) throw new CsvMigrationError(errors);

  const events = new Map<string, GraphSyncEvent>();
  for (const [index, row] of normalized.entries()) {
    const provenance = { sourceReference: input.sourceReference, csvRow: index + 2 };
    const identityId = `csv:${row.provider}:identity:${row.identity_id}`;
    const resourceId = `csv:${row.provider}:resource:${row.resource_id}`;
    const entitlementId = `csv:${row.provider}:entitlement:${row.resource_id}:${row.entitlement}`;
    events.set(`identity:${identityId}`, {
      type: 'identity.upsert',
      entity: {
        kind: 'identity',
        tenantId: input.tenantId,
        id: identityId,
        connectorId: input.connectorId,
        externalId: row.identity_id,
        displayName: row.identity_name,
        status: 'ACTIVE',
        observedAt: input.observedAt,
        attributes: provenance,
      },
    });
    events.set(`resource:${resourceId}`, {
      type: 'resource.upsert',
      entity: {
        kind: 'resource',
        tenantId: input.tenantId,
        id: resourceId,
        connectorId: input.connectorId,
        externalId: row.resource_id,
        displayName: row.resource_name,
        resourceType: 'csv_import',
        observedAt: input.observedAt,
        attributes: provenance,
      },
    });
    events.set(`entitlement:${entitlementId}`, {
      type: 'entitlement.upsert',
      entity: {
        kind: 'entitlement',
        tenantId: input.tenantId,
        id: entitlementId,
        connectorId: input.connectorId,
        externalId: `${row.resource_id}:${row.entitlement}`,
        displayName: row.entitlement,
        resourceId,
        entitlementType: 'role',
        privileged: /admin|owner|maintain|write/i.test(row.entitlement),
        observedAt: input.observedAt,
        attributes: provenance,
      },
    });
    events.set(`grant:${identityId}:${entitlementId}`, {
      type: 'grant.upsert',
      entity: {
        kind: 'grant',
        tenantId: input.tenantId,
        id: `csv:${row.provider}:grant:${row.identity_id}:${row.resource_id}:${row.entitlement}`,
        connectorId: input.connectorId,
        externalId: `${row.identity_id}:${row.resource_id}:${row.entitlement}`,
        identityId,
        entitlementId,
        grantType: 'UNKNOWN',
        observedAt: input.observedAt,
        attributes: provenance,
      },
    });
  }
  return {
    tenantId: input.tenantId,
    connectorId: input.connectorId,
    startedAt: input.observedAt,
    completedAt: input.observedAt,
    events: [...events.values()].sort((left, right) => {
      const priority = eventPriority(left) - eventPriority(right);
      return priority || left.entity.id.localeCompare(right.entity.id);
    }),
  };
}

function eventPriority(event: GraphSyncEvent): number {
  switch (event.type) {
    case 'identity.upsert':
      return 0;
    case 'resource.upsert':
      return 1;
    case 'entitlement.upsert':
      return 2;
    case 'grant.upsert':
      return 3;
  }
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [[]];
  let field = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      rows.at(-1)!.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      rows.at(-1)!.push(field);
      rows.push([]);
      field = '';
    } else field += character;
  }
  if (quoted) throw new CsvMigrationError(['CSV contains an unterminated quoted field']);
  rows.at(-1)!.push(field);
  return rows.filter((row) => row.some((value) => value.length > 0));
}
