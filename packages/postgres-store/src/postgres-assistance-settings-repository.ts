import type { AssistanceSettings, AssistanceSettingsRepository } from '@aegis/assistance';
import type { Pool } from 'pg';
type Row = { settings: AssistanceSettings };
export class PostgresAssistanceSettingsRepository implements AssistanceSettingsRepository {
  constructor(private readonly pool: Pool) {}
  async get(tenantId: string) {
    const result = await this.pool.query<Row>(
      'SELECT settings FROM governance_assistance_settings WHERE tenant_id=$1',
      [tenantId],
    );
    return result.rows[0]?.settings;
  }
  async save(settings: AssistanceSettings) {
    await this.pool.query(
      'INSERT INTO governance_assistance_settings (tenant_id,updated_at,settings) VALUES ($1,$2,$3) ON CONFLICT (tenant_id) DO UPDATE SET updated_at=EXCLUDED.updated_at,settings=EXCLUDED.settings',
      [settings.tenantId, settings.updatedAt, settings],
    );
  }
}
