import { randomUUID } from 'node:crypto';
import {
  supportedActionKinds,
  supportedMockProviders,
  type ActionKind,
  type MockProviderId,
} from '@aegis/action-contract';
import type { ActionExecutionGate, CertifiedMockAdapter } from '@aegis/action-engine';
import { certifyReadOnlyConnector, type FixtureBundle } from '@aegis/connector-test-kit';
import type { ConnectorManifest } from '@open-saas-governance/connector-protocol';

export const providerCertificationSchemaVersion = 'provider-certification.v1' as const;

export interface TestTenantActivation {
  readonly schemaVersion: typeof providerCertificationSchemaVersion;
  readonly id: string;
  readonly tenantId: string;
  readonly provider: MockProviderId;
  readonly environment: 'test';
  readonly allowedActionKinds: readonly ActionKind[];
  readonly grantedScopes: readonly string[];
  readonly activatedBy: string;
  readonly activatedAt: string;
  readonly expiresAt: string;
}

export interface CreateTestTenantActivationInput {
  readonly provider: MockProviderId;
  readonly environment: 'test';
  readonly allowedActionKinds: readonly ActionKind[];
  readonly grantedScopes: readonly string[];
  readonly activatedBy: string;
  readonly expiresAt: string;
}

export interface ProviderActionProbe {
  readonly kind: ActionKind;
  readonly requiredScopes: readonly string[];
}

export interface ProviderCertification {
  readonly schemaVersion: typeof providerCertificationSchemaVersion;
  readonly id: string;
  readonly tenantId: string;
  readonly activationId: string;
  readonly provider: MockProviderId;
  readonly connectorId: string;
  readonly fixtureDigest: string;
  readonly endpointInventory: readonly string[];
  readonly actionProbes: readonly ProviderActionProbe[];
  readonly certifiedBy: string;
  readonly certifiedAt: string;
  readonly status: 'test_tenant_certified';
  readonly providerMutation: false;
}

export interface CreateProviderCertificationInput {
  readonly activationId: string;
  readonly manifest: ConnectorManifest;
  readonly fixture: FixtureBundle;
  readonly adapter: CertifiedMockAdapter;
  readonly actionProbes: readonly ProviderActionProbe[];
  readonly certifiedBy: string;
}

export interface ProviderCertificationRepository {
  saveActivation(activation: TestTenantActivation): Promise<void>;
  getActivation(tenantId: string, activationId: string): Promise<TestTenantActivation | undefined>;
  listActivations(tenantId: string): Promise<readonly TestTenantActivation[]>;
  saveCertification(certification: ProviderCertification): Promise<void>;
  listCertifications(tenantId: string): Promise<readonly ProviderCertification[]>;
}

export class InMemoryProviderCertificationRepository implements ProviderCertificationRepository {
  readonly #activations = new Map<string, TestTenantActivation>();
  readonly #certifications = new Map<string, ProviderCertification>();

  async saveActivation(activation: TestTenantActivation): Promise<void> {
    this.#activations.set(`${activation.tenantId}:${activation.id}`, activation);
  }

  async getActivation(
    tenantId: string,
    activationId: string,
  ): Promise<TestTenantActivation | undefined> {
    return this.#activations.get(`${tenantId}:${activationId}`);
  }

  async listActivations(tenantId: string): Promise<readonly TestTenantActivation[]> {
    return [...this.#activations.values()]
      .filter((activation) => activation.tenantId === tenantId)
      .sort((left, right) => right.activatedAt.localeCompare(left.activatedAt));
  }

  async saveCertification(certification: ProviderCertification): Promise<void> {
    this.#certifications.set(`${certification.tenantId}:${certification.id}`, certification);
  }

  async listCertifications(tenantId: string): Promise<readonly ProviderCertification[]> {
    return [...this.#certifications.values()]
      .filter((certification) => certification.tenantId === tenantId)
      .sort((left, right) => right.certifiedAt.localeCompare(left.certifiedAt));
  }
}

function canonicalScope(scope: string): string {
  return scope.trim();
}

function requireActivationInput(input: CreateTestTenantActivationInput, now: Date): void {
  if (input.environment !== 'test') throw new Error('Only test-tenant activation is supported');
  if (!supportedMockProviders.includes(input.provider))
    throw new Error('Unsupported mock provider');
  if (!input.activatedBy.trim()) throw new Error('Activation actor is required');
  if (!input.allowedActionKinds.length) throw new Error('At least one action kind is required');
  if (input.allowedActionKinds.some((kind) => !supportedActionKinds.includes(kind))) {
    throw new Error('Unsupported mock action kind');
  }
  if (!input.grantedScopes.length || input.grantedScopes.some((scope) => !canonicalScope(scope))) {
    throw new Error('At least one granted scope is required');
  }
  const expiry = new Date(input.expiresAt);
  if (Number.isNaN(expiry.valueOf()) || expiry <= now) {
    throw new Error('Test-tenant activation must have a future expiry');
  }
  if (expiry.valueOf() - now.valueOf() > 31 * 24 * 60 * 60 * 1000) {
    throw new Error('Test-tenant activation cannot exceed 31 days');
  }
}

export class TestTenantActivationRegistry implements ActionExecutionGate {
  constructor(
    private readonly repository: ProviderCertificationRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  async activate(
    tenantId: string,
    input: CreateTestTenantActivationInput,
  ): Promise<TestTenantActivation> {
    const now = this.now();
    requireActivationInput(input, now);
    const activation: TestTenantActivation = {
      schemaVersion: providerCertificationSchemaVersion,
      id: `test-activation:${this.createId()}`,
      tenantId,
      provider: input.provider,
      environment: 'test',
      allowedActionKinds: [...new Set(input.allowedActionKinds)],
      grantedScopes: [...new Set(input.grantedScopes.map(canonicalScope))],
      activatedBy: input.activatedBy.trim().toLowerCase(),
      activatedAt: now.toISOString(),
      expiresAt: input.expiresAt,
    };
    await this.repository.saveActivation(activation);
    return activation;
  }

  list(tenantId: string): Promise<readonly TestTenantActivation[]> {
    return this.repository.listActivations(tenantId);
  }

  async requireActivation(tenantId: string, activationId: string): Promise<TestTenantActivation> {
    const activation = await this.repository.getActivation(tenantId, activationId);
    if (!activation) throw new Error('Test-tenant activation was not found');
    if (new Date(activation.expiresAt) <= this.now()) {
      throw new Error('Test-tenant activation has expired');
    }
    return activation;
  }

  async authorize(
    tenantId: string,
    provider: MockProviderId,
    kind: ActionKind,
    requiredScopes: readonly string[],
  ): Promise<void> {
    const activations = await this.repository.listActivations(tenantId);
    const activation = activations.find(
      (candidate) => candidate.provider === provider && new Date(candidate.expiresAt) > this.now(),
    );
    if (!activation) throw new Error(`No active test-tenant activation exists for ${provider}`);
    if (!activation.allowedActionKinds.includes(kind)) {
      throw new Error(`Test-tenant activation does not allow action ${kind}`);
    }
    if (
      !requiredScopes.every((scope) => activation.grantedScopes.includes(canonicalScope(scope)))
    ) {
      throw new Error('Test-tenant activation does not grant required scopes');
    }
  }
}

export async function certifyTestTenantProvider(
  repository: ProviderCertificationRepository,
  registry: TestTenantActivationRegistry,
  tenantId: string,
  input: CreateProviderCertificationInput,
  now: () => Date = () => new Date(),
  createId: () => string = randomUUID,
): Promise<ProviderCertification> {
  if (!input.certifiedBy.trim()) throw new Error('Certification actor is required');
  if (input.adapter.mode !== 'mock' || input.adapter.certified !== true) {
    throw new Error('Only certified mock adapters can be test-tenant certified');
  }
  if (!input.actionProbes.length) throw new Error('At least one action probe is required');
  const activation = await registry.requireActivation(tenantId, input.activationId);
  if (activation.provider !== input.adapter.provider) {
    throw new Error('Activation provider does not match the adapter');
  }
  for (const probe of input.actionProbes) {
    await registry.authorize(tenantId, activation.provider, probe.kind, probe.requiredScopes);
    if (!input.adapter.supportedKinds.includes(probe.kind)) {
      throw new Error(`Certified adapter does not support action ${probe.kind}`);
    }
  }
  const fixtureCertification = certifyReadOnlyConnector(
    input.manifest,
    input.fixture,
    now().toISOString(),
  );
  const certification: ProviderCertification = {
    schemaVersion: providerCertificationSchemaVersion,
    id: `provider-certification:${createId()}`,
    tenantId,
    activationId: activation.id,
    provider: activation.provider,
    connectorId: input.manifest.id,
    fixtureDigest: fixtureCertification.fixtureDigest,
    endpointInventory: fixtureCertification.endpointInventory,
    actionProbes: input.actionProbes,
    certifiedBy: input.certifiedBy.trim().toLowerCase(),
    certifiedAt: now().toISOString(),
    status: 'test_tenant_certified',
    providerMutation: false,
  };
  await repository.saveCertification(certification);
  return certification;
}
