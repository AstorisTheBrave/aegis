import { normalizeCatalogValue } from '@aegis/saas-catalog';
import type { DiscoveryObservation, DiscoveryRepository } from '@aegis/discovery';
import type { Pool } from 'pg';

export class PostgresDiscoveryRepository implements DiscoveryRepository {
  constructor(private readonly pool: Pool) {}

  async record(observation: DiscoveryObservation): Promise<DiscoveryObservation> {
    await this.pool.query(
      `INSERT INTO governance_discovery_observations
        (tenant_id, source, id, normalized_vendor_name, normalized_domain, observed_at, activity_count, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, source, id) DO UPDATE SET
         normalized_vendor_name = EXCLUDED.normalized_vendor_name, normalized_domain = EXCLUDED.normalized_domain,
         observed_at = EXCLUDED.observed_at, activity_count = EXCLUDED.activity_count, payload = EXCLUDED.payload`,
      [
        observation.tenantId,
        observation.source,
        observation.id,
        normalizeCatalogValue(observation.vendorName),
        observation.domain ? normalizeCatalogValue(observation.domain) : null,
        observation.observedAt,
        observation.activityCount,
        observation,
      ],
    );
    return observation;
  }

  async list(tenantId: string): Promise<readonly DiscoveryObservation[]> {
    const result = await this.pool.query<{ payload: DiscoveryObservation }>(
      'SELECT payload FROM governance_discovery_observations WHERE tenant_id = $1 ORDER BY observed_at DESC, id',
      [tenantId],
    );
    return result.rows.map((row) => row.payload);
  }
}
