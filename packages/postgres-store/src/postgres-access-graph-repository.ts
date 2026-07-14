import type {
  AccessGraphRepository,
  AccessView,
  Entitlement,
  Grant,
  GraphSyncBatch,
  Identity,
  JsonObject,
  Resource,
} from '@open-saas-governance/access-graph';
import type { Pool, PoolClient } from 'pg';

type IdentityRow = Omit<Identity, 'kind' | 'observedAt' | 'attributes'> & {
  observed_at: Date;
  attributes: JsonObject;
};

type AccessRow = {
  identity_id: string;
  identity_connector_id: string;
  identity_external_id: string;
  identity_display_name: string;
  identity_email: string | null;
  identity_status: Identity['status'];
  identity_observed_at: Date;
  identity_attributes: JsonObject;
  resource_id: string;
  resource_connector_id: string;
  resource_external_id: string;
  resource_display_name: string;
  resource_type: string;
  resource_parent_resource_id: string | null;
  resource_observed_at: Date;
  resource_attributes: JsonObject;
  entitlement_id: string;
  entitlement_connector_id: string;
  entitlement_external_id: string;
  entitlement_display_name: string;
  entitlement_entitlement_type: string;
  entitlement_privileged: boolean;
  entitlement_observed_at: Date;
  entitlement_attributes: JsonObject;
  grant_id: string;
  grant_connector_id: string;
  grant_external_id: string;
  grant_grant_type: Grant['grantType'];
  grant_expires_at: Date | null;
  grant_observed_at: Date;
  grant_attributes: JsonObject;
};

export class PostgresAccessGraphRepository implements AccessGraphRepository {
  constructor(private readonly pool: Pool) {}

  async applySync(batch: GraphSyncBatch): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET CONSTRAINTS ALL DEFERRED');

      for (const event of batch.events) {
        if (event.entity.tenantId !== batch.tenantId) {
          throw new Error(`Event tenant ${event.entity.tenantId} does not match batch tenant`);
        }
        if (event.entity.connectorId !== batch.connectorId) {
          throw new Error(
            `Event connector ${event.entity.connectorId} does not match batch connector`,
          );
        }

        switch (event.type) {
          case 'identity.upsert':
            await upsertIdentity(client, event.entity);
            break;
          case 'resource.upsert':
            await upsertResource(client, event.entity);
            break;
          case 'entitlement.upsert':
            await upsertEntitlement(client, event.entity);
            break;
          case 'grant.upsert':
            await upsertGrant(client, event.entity);
            break;
        }
      }

      await client.query(
        `INSERT INTO governance_connector_syncs
          (tenant_id, connector_id, started_at, completed_at, event_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          batch.tenantId,
          batch.connectorId,
          batch.startedAt,
          batch.completedAt,
          batch.events.length,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getIdentity(tenantId: string, identityId: string): Promise<Identity | undefined> {
    const result = await this.pool.query<IdentityRow>(
      `SELECT tenant_id AS "tenantId", id, connector_id AS "connectorId", external_id AS "externalId",
              display_name AS "displayName", email, status, observed_at, attributes
         FROM governance_identities
        WHERE tenant_id = $1 AND id = $2`,
      [tenantId, identityId],
    );
    const row = result.rows[0];
    return row ? toIdentity(row) : undefined;
  }

  async listIdentities(tenantId: string): Promise<readonly Identity[]> {
    const result = await this.pool.query<IdentityRow>(
      `SELECT tenant_id AS "tenantId", id, connector_id AS "connectorId", external_id AS "externalId",
              display_name AS "displayName", email, status, observed_at, attributes
         FROM governance_identities
        WHERE tenant_id = $1
        ORDER BY display_name, id`,
      [tenantId],
    );
    return result.rows.map(toIdentity);
  }

  async listResources(tenantId: string): Promise<readonly Resource[]> {
    const result = await this.pool.query<{
      tenantId: string;
      id: string;
      connectorId: string;
      externalId: string;
      displayName: string;
      resourceType: string;
      parentResourceId: string | null;
      observed_at: Date;
      attributes: JsonObject;
    }>(
      `SELECT tenant_id AS "tenantId", id, connector_id AS "connectorId", external_id AS "externalId",
              display_name AS "displayName", resource_type AS "resourceType",
              parent_resource_id AS "parentResourceId", observed_at, attributes
         FROM governance_resources
        WHERE tenant_id = $1
        ORDER BY display_name, id`,
      [tenantId],
    );
    return result.rows.map((row) => ({
      kind: 'resource',
      tenantId: row.tenantId,
      id: row.id,
      connectorId: row.connectorId,
      externalId: row.externalId,
      displayName: row.displayName,
      resourceType: row.resourceType,
      ...(row.parentResourceId ? { parentResourceId: row.parentResourceId } : {}),
      observedAt: row.observed_at.toISOString(),
      attributes: row.attributes,
    }));
  }

  async listAccess(tenantId: string): Promise<readonly AccessView[]> {
    const identities = await this.listIdentities(tenantId);
    return (
      await Promise.all(
        identities.map((identity) => this.listAccessForIdentity(tenantId, identity.id)),
      )
    ).flat();
  }

  async listAccessForIdentity(
    tenantId: string,
    identityId: string,
  ): Promise<readonly AccessView[]> {
    const result = await this.pool.query<AccessRow>(
      `SELECT
          i.id AS identity_id, i.connector_id AS identity_connector_id,
          i.external_id AS identity_external_id, i.display_name AS identity_display_name,
          i.email AS identity_email, i.status AS identity_status,
          i.observed_at AS identity_observed_at, i.attributes AS identity_attributes,
          r.id AS resource_id, r.connector_id AS resource_connector_id,
          r.external_id AS resource_external_id, r.display_name AS resource_display_name,
          r.resource_type AS resource_type, r.parent_resource_id AS resource_parent_resource_id,
          r.observed_at AS resource_observed_at, r.attributes AS resource_attributes,
          e.id AS entitlement_id, e.connector_id AS entitlement_connector_id,
          e.external_id AS entitlement_external_id, e.display_name AS entitlement_display_name,
          e.entitlement_type AS entitlement_entitlement_type, e.privileged AS entitlement_privileged,
          e.observed_at AS entitlement_observed_at, e.attributes AS entitlement_attributes,
          g.id AS grant_id, g.connector_id AS grant_connector_id, g.external_id AS grant_external_id,
          g.grant_type AS grant_grant_type, g.expires_at AS grant_expires_at,
          g.observed_at AS grant_observed_at, g.attributes AS grant_attributes
        FROM governance_grants g
        JOIN governance_identities i ON i.tenant_id = g.tenant_id AND i.id = g.identity_id
        JOIN governance_entitlements e ON e.tenant_id = g.tenant_id AND e.id = g.entitlement_id
        JOIN governance_resources r ON r.tenant_id = e.tenant_id AND r.id = e.resource_id
       WHERE g.tenant_id = $1 AND g.identity_id = $2
       ORDER BY g.id`,
      [tenantId, identityId],
    );

    return result.rows.map((row) => ({
      identity: {
        kind: 'identity',
        tenantId,
        id: row.identity_id,
        connectorId: row.identity_connector_id,
        externalId: row.identity_external_id,
        displayName: row.identity_display_name,
        ...(typeof row.identity_attributes.identityType === 'string'
          ? { identityType: row.identity_attributes.identityType as Identity['identityType'] }
          : {}),
        ...(row.identity_email ? { email: row.identity_email } : {}),
        status: row.identity_status,
        observedAt: row.identity_observed_at.toISOString(),
        attributes: row.identity_attributes,
      },
      resource: {
        kind: 'resource',
        tenantId,
        id: row.resource_id,
        connectorId: row.resource_connector_id,
        externalId: row.resource_external_id,
        displayName: row.resource_display_name,
        resourceType: row.resource_type,
        ...(row.resource_parent_resource_id
          ? { parentResourceId: row.resource_parent_resource_id }
          : {}),
        observedAt: row.resource_observed_at.toISOString(),
        attributes: row.resource_attributes,
      },
      entitlement: {
        kind: 'entitlement',
        tenantId,
        id: row.entitlement_id,
        connectorId: row.entitlement_connector_id,
        externalId: row.entitlement_external_id,
        displayName: row.entitlement_display_name,
        resourceId: row.resource_id,
        entitlementType: row.entitlement_entitlement_type,
        privileged: row.entitlement_privileged,
        observedAt: row.entitlement_observed_at.toISOString(),
        attributes: row.entitlement_attributes,
      },
      grant: {
        kind: 'grant',
        tenantId,
        id: row.grant_id,
        connectorId: row.grant_connector_id,
        externalId: row.grant_external_id,
        identityId: row.identity_id,
        entitlementId: row.entitlement_id,
        grantType: row.grant_grant_type,
        ...(row.grant_expires_at ? { expiresAt: row.grant_expires_at.toISOString() } : {}),
        observedAt: row.grant_observed_at.toISOString(),
        attributes: row.grant_attributes,
      },
    }));
  }
}

function toIdentity(row: IdentityRow): Identity {
  const identityType = row.attributes.identityType;
  return {
    kind: 'identity',
    tenantId: row.tenantId,
    id: row.id,
    connectorId: row.connectorId,
    externalId: row.externalId,
    displayName: row.displayName,
    ...(typeof identityType === 'string'
      ? { identityType: identityType as Identity['identityType'] }
      : {}),
    ...(row.email ? { email: row.email } : {}),
    status: row.status,
    observedAt: row.observed_at.toISOString(),
    attributes: row.attributes,
  };
}

async function upsertIdentity(client: PoolClient, identity: Identity): Promise<void> {
  const attributes = {
    ...identity.attributes,
    ...(identity.identityType ? { identityType: identity.identityType } : {}),
  };
  await client.query(
    `INSERT INTO governance_identities
      (tenant_id, id, connector_id, external_id, display_name, email, status, observed_at, attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, id) DO UPDATE SET
       connector_id = EXCLUDED.connector_id,
       external_id = EXCLUDED.external_id,
       display_name = EXCLUDED.display_name,
       email = EXCLUDED.email,
       status = EXCLUDED.status,
       observed_at = EXCLUDED.observed_at,
       attributes = EXCLUDED.attributes`,
    [
      identity.tenantId,
      identity.id,
      identity.connectorId,
      identity.externalId,
      identity.displayName,
      identity.email ?? null,
      identity.status,
      identity.observedAt,
      attributes,
    ],
  );
}

async function upsertResource(client: PoolClient, resource: Resource): Promise<void> {
  await client.query(
    `INSERT INTO governance_resources
      (tenant_id, id, connector_id, external_id, display_name, resource_type, parent_resource_id,
       observed_at, attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, id) DO UPDATE SET
       connector_id = EXCLUDED.connector_id,
       external_id = EXCLUDED.external_id,
       display_name = EXCLUDED.display_name,
       resource_type = EXCLUDED.resource_type,
       parent_resource_id = EXCLUDED.parent_resource_id,
       observed_at = EXCLUDED.observed_at,
       attributes = EXCLUDED.attributes`,
    [
      resource.tenantId,
      resource.id,
      resource.connectorId,
      resource.externalId,
      resource.displayName,
      resource.resourceType,
      resource.parentResourceId ?? null,
      resource.observedAt,
      resource.attributes,
    ],
  );
}

async function upsertEntitlement(client: PoolClient, entitlement: Entitlement): Promise<void> {
  await client.query(
    `INSERT INTO governance_entitlements
      (tenant_id, id, connector_id, external_id, display_name, resource_id, entitlement_type,
       privileged, observed_at, attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (tenant_id, id) DO UPDATE SET
       connector_id = EXCLUDED.connector_id,
       external_id = EXCLUDED.external_id,
       display_name = EXCLUDED.display_name,
       resource_id = EXCLUDED.resource_id,
       entitlement_type = EXCLUDED.entitlement_type,
       privileged = EXCLUDED.privileged,
       observed_at = EXCLUDED.observed_at,
       attributes = EXCLUDED.attributes`,
    [
      entitlement.tenantId,
      entitlement.id,
      entitlement.connectorId,
      entitlement.externalId,
      entitlement.displayName,
      entitlement.resourceId,
      entitlement.entitlementType,
      entitlement.privileged,
      entitlement.observedAt,
      entitlement.attributes,
    ],
  );
}

async function upsertGrant(client: PoolClient, grant: Grant): Promise<void> {
  await client.query(
    `INSERT INTO governance_grants
      (tenant_id, id, connector_id, external_id, identity_id, entitlement_id, grant_type, expires_at,
       observed_at, attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (tenant_id, id) DO UPDATE SET
       connector_id = EXCLUDED.connector_id,
       external_id = EXCLUDED.external_id,
       identity_id = EXCLUDED.identity_id,
       entitlement_id = EXCLUDED.entitlement_id,
       grant_type = EXCLUDED.grant_type,
       expires_at = EXCLUDED.expires_at,
       observed_at = EXCLUDED.observed_at,
       attributes = EXCLUDED.attributes`,
    [
      grant.tenantId,
      grant.id,
      grant.connectorId,
      grant.externalId,
      grant.identityId,
      grant.entitlementId,
      grant.grantType,
      grant.expiresAt ?? null,
      grant.observedAt,
      grant.attributes,
    ],
  );
}
