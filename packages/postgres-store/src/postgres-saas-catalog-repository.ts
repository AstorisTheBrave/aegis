import {
  normalizeCatalogApplication,
  type CatalogApplication,
  type CatalogOwner,
  type SaasCatalogRepository,
} from '@aegis/saas-catalog';
import type { Pool } from 'pg';

export class PostgresSaasCatalogRepository implements SaasCatalogRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(application: CatalogApplication): Promise<CatalogApplication> {
    const normalized = normalizeCatalogApplication(application);
    await this.pool.query(
      `INSERT INTO governance_saas_catalog_applications
        (tenant_id, id, normalized_name, vendor_name, risk_tier, payload, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, id) DO UPDATE SET
         normalized_name = EXCLUDED.normalized_name, vendor_name = EXCLUDED.vendor_name,
         risk_tier = EXCLUDED.risk_tier, payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
      [
        normalized.tenantId,
        normalized.id,
        normalized.normalizedName,
        normalized.vendorName,
        normalized.riskTier,
        normalized,
        normalized.updatedAt,
      ],
    );
    return normalized;
  }

  async get(tenantId: string, id: string): Promise<CatalogApplication | undefined> {
    const result = await this.pool.query<{ payload: CatalogApplication }>(
      'SELECT payload FROM governance_saas_catalog_applications WHERE tenant_id = $1 AND id = $2',
      [tenantId, id],
    );
    return result.rows[0]?.payload;
  }

  async list(tenantId: string): Promise<readonly CatalogApplication[]> {
    const result = await this.pool.query<{ payload: CatalogApplication }>(
      'SELECT payload FROM governance_saas_catalog_applications WHERE tenant_id = $1 ORDER BY vendor_name, id',
      [tenantId],
    );
    return result.rows.map((row) => row.payload);
  }

  async assignOwners(
    tenantId: string,
    id: string,
    owners: readonly CatalogOwner[],
    updatedAt: string,
  ): Promise<CatalogApplication | undefined> {
    const application = await this.get(tenantId, id);
    if (!application) return undefined;
    return this.upsert({ ...application, owners, updatedAt });
  }
}
