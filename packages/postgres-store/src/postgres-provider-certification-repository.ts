import type {
  ProviderCertification,
  ProviderCertificationRepository,
  TestTenantActivation,
} from '@aegis/provider-certification';
import type { Pool } from 'pg';

type ActivationRow = { activation: TestTenantActivation };
type CertificationRow = { certification: ProviderCertification };

export class PostgresProviderCertificationRepository implements ProviderCertificationRepository {
  constructor(private readonly pool: Pool) {}

  async saveActivation(activation: TestTenantActivation): Promise<void> {
    await this.pool.query(
      `INSERT INTO governance_test_tenant_activations
         (tenant_id, id, provider, activated_at, expires_at, activation)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, id) DO UPDATE SET activation = EXCLUDED.activation,
         expires_at = EXCLUDED.expires_at`,
      [
        activation.tenantId,
        activation.id,
        activation.provider,
        activation.activatedAt,
        activation.expiresAt,
        activation,
      ],
    );
  }

  async getActivation(
    tenantId: string,
    activationId: string,
  ): Promise<TestTenantActivation | undefined> {
    const result = await this.pool.query<ActivationRow>(
      `SELECT activation FROM governance_test_tenant_activations WHERE tenant_id = $1 AND id = $2`,
      [tenantId, activationId],
    );
    return result.rows[0]?.activation;
  }

  async listActivations(tenantId: string): Promise<readonly TestTenantActivation[]> {
    const result = await this.pool.query<ActivationRow>(
      `SELECT activation FROM governance_test_tenant_activations
       WHERE tenant_id = $1 ORDER BY activated_at DESC, id DESC`,
      [tenantId],
    );
    return result.rows.map((row) => row.activation);
  }

  async saveCertification(certification: ProviderCertification): Promise<void> {
    await this.pool.query(
      `INSERT INTO governance_provider_certifications
         (tenant_id, id, activation_id, provider, certified_at, certification)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, id) DO NOTHING`,
      [
        certification.tenantId,
        certification.id,
        certification.activationId,
        certification.provider,
        certification.certifiedAt,
        certification,
      ],
    );
  }

  async listCertifications(tenantId: string): Promise<readonly ProviderCertification[]> {
    const result = await this.pool.query<CertificationRow>(
      `SELECT certification FROM governance_provider_certifications
       WHERE tenant_id = $1 ORDER BY certified_at DESC, id DESC`,
      [tenantId],
    );
    return result.rows.map((row) => row.certification);
  }
}
