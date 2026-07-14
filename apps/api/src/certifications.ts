import {
  certifyTestTenantProvider,
  TestTenantActivationRegistry,
  type CreateProviderCertificationInput,
  type CreateTestTenantActivationInput,
  type ProviderCertification,
  type ProviderCertificationRepository,
  type TestTenantActivation,
} from '@aegis/provider-certification';
import { createCertifiedMockAdapters } from '@aegis/action-engine';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';

export type ProviderCertificationInput = Omit<CreateProviderCertificationInput, 'adapter'>;

export class ProviderCertificationManager {
  readonly activationRegistry: TestTenantActivationRegistry;

  constructor(
    private readonly repository: ProviderCertificationRepository,
    private readonly audit: AuditLedger,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.activationRegistry = new TestTenantActivationRegistry(repository, now);
  }

  async activate(
    tenantId: string,
    input: CreateTestTenantActivationInput,
  ): Promise<TestTenantActivation> {
    const activation = await this.activationRegistry.activate(tenantId, input);
    await this.audit.append({
      tenantId,
      occurredAt: activation.activatedAt,
      actor: activation.activatedBy,
      type: 'provider.test_tenant_activated',
      correlationId: activation.id,
      data: { activation, providerMutation: false },
    });
    return activation;
  }

  listActivations(tenantId: string): Promise<readonly TestTenantActivation[]> {
    return this.activationRegistry.list(tenantId);
  }

  listCertifications(tenantId: string): Promise<readonly ProviderCertification[]> {
    return this.repository.listCertifications(tenantId);
  }

  async certify(
    tenantId: string,
    input: ProviderCertificationInput,
  ): Promise<ProviderCertification> {
    const activation = await this.activationRegistry.requireActivation(
      tenantId,
      input.activationId,
    );
    const adapter = createCertifiedMockAdapters().find(
      (candidate) => candidate.provider === activation.provider,
    );
    if (!adapter) throw new Error('No certified mock adapter is available for this activation');
    const certification = await certifyTestTenantProvider(
      this.repository,
      this.activationRegistry,
      tenantId,
      { ...input, adapter },
      this.now,
    );
    await this.audit.append({
      tenantId,
      occurredAt: certification.certifiedAt,
      actor: certification.certifiedBy,
      type: 'provider.certified',
      correlationId: certification.id,
      data: { certification, providerMutation: false },
    });
    return certification;
  }
}
