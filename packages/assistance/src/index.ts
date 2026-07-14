export const assistanceSchemaVersion = 'assistance.v1' as const;
export const deterministicLocalProvider = 'aegis-deterministic-local.v1' as const;
export type AssistanceKind = 'evidence_summary' | 'recommendation_draft' | 'workflow_draft';
const assistanceKinds: readonly AssistanceKind[] = [
  'evidence_summary',
  'recommendation_draft',
  'workflow_draft',
];
export interface AssistanceSource {
  readonly id: string;
  readonly label: string;
  readonly observedAt: string;
}
export interface AssistanceSettings {
  readonly schemaVersion: typeof assistanceSchemaVersion;
  readonly tenantId: string;
  readonly enabled: boolean;
  readonly allowedProviders: readonly string[];
  readonly budgetPerRequest: number;
  readonly updatedAt: string;
  readonly updatedBy: string;
}
export interface UpdateAssistanceSettingsInput {
  readonly enabled: boolean;
  readonly allowedProviders: readonly string[];
  readonly budgetPerRequest: number;
  readonly actor: string;
}
export interface AssistanceRequest {
  readonly kind: AssistanceKind;
  readonly providerId: string;
  readonly actor: string;
  readonly promptVersion: string;
  readonly sourceFacts: readonly AssistanceSource[];
  readonly instruction?: string;
}
export interface AssistanceOutput {
  readonly schemaVersion: typeof assistanceSchemaVersion;
  readonly id: string;
  readonly tenantId: string;
  readonly kind: AssistanceKind;
  readonly providerId: string;
  readonly promptVersion: string;
  readonly createdAt: string;
  readonly sourceFacts: readonly AssistanceSource[];
  readonly narrative: string;
  readonly redactionCount: number;
  readonly budgetUsed: number;
  readonly providerMutation: false;
  readonly enforcement: 'not_authorized';
}
export interface AssistanceSettingsRepository {
  get(tenantId: string): Promise<AssistanceSettings | undefined>;
  save(settings: AssistanceSettings): Promise<void>;
}
export class InMemoryAssistanceSettingsRepository implements AssistanceSettingsRepository {
  readonly #items = new Map<string, AssistanceSettings>();
  async get(tenantId: string) {
    return this.#items.get(tenantId);
  }
  async save(settings: AssistanceSettings) {
    this.#items.set(settings.tenantId, settings);
  }
}
function redact(value: string): { value: string; count: number } {
  const matches = value.match(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi) ?? [];
  return {
    value: value.replace(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, '[REDACTED]'),
    count: matches.length,
  };
}
export class AssistanceEngine {
  constructor(
    private readonly repository: AssistanceSettingsRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => globalThis.crypto.randomUUID(),
  ) {}
  async settings(tenantId: string): Promise<AssistanceSettings> {
    return (
      (await this.repository.get(tenantId)) ?? {
        schemaVersion: assistanceSchemaVersion,
        tenantId,
        enabled: false,
        allowedProviders: [deterministicLocalProvider],
        budgetPerRequest: 400,
        updatedAt: this.now().toISOString(),
        updatedBy: 'system',
      }
    );
  }
  async updateSettings(
    tenantId: string,
    input: UpdateAssistanceSettingsInput,
  ): Promise<AssistanceSettings> {
    if (
      !input.actor.trim() ||
      !input.allowedProviders.length ||
      input.allowedProviders.some((id) => id !== deterministicLocalProvider) ||
      !Number.isInteger(input.budgetPerRequest) ||
      input.budgetPerRequest < 1 ||
      input.budgetPerRequest > 4000
    )
      throw new Error('Invalid assistance settings');
    const settings: AssistanceSettings = {
      schemaVersion: assistanceSchemaVersion,
      tenantId,
      enabled: input.enabled,
      allowedProviders: [...new Set(input.allowedProviders)],
      budgetPerRequest: input.budgetPerRequest,
      updatedAt: this.now().toISOString(),
      updatedBy: input.actor.trim().toLowerCase(),
    };
    await this.repository.save(settings);
    return settings;
  }
  async assist(tenantId: string, input: AssistanceRequest): Promise<AssistanceOutput> {
    const settings = await this.settings(tenantId);
    if (!settings.enabled) throw new Error('Assistance is disabled for this tenant');
    if (
      input.providerId !== deterministicLocalProvider ||
      !settings.allowedProviders.includes(input.providerId)
    )
      throw new Error('Assistance provider is not allowed');
    if (
      !assistanceKinds.includes(input.kind) ||
      !input.actor.trim() ||
      !input.promptVersion.trim() ||
      !input.sourceFacts.length ||
      input.sourceFacts.some(
        (fact) =>
          !fact.id.trim() ||
          !fact.label.trim() ||
          Number.isNaN(new Date(fact.observedAt).valueOf()),
      )
    )
      throw new Error('Source-linked assistance input is required');
    const instruction = redact(input.instruction ?? '');
    const sourceFacts = input.sourceFacts.map((fact) => {
      const label = redact(fact.label);
      return { source: { ...fact, label: label.value }, redactionCount: label.count };
    });
    const redactionCount =
      instruction.count + sourceFacts.reduce((sum, fact) => sum + fact.redactionCount, 0);
    const narrative = `Grounded ${input.kind.replaceAll('_', ' ')} based on: ${sourceFacts.map((fact) => fact.source.label).join('; ')}.${instruction.value ? ` Operator context: ${instruction.value}` : ''}`;
    const budgetUsed = Math.ceil(narrative.length / 4);
    if (budgetUsed > settings.budgetPerRequest)
      throw new Error('Assistance request exceeds the configured budget');
    return {
      schemaVersion: assistanceSchemaVersion,
      id: `assistance:${this.createId()}`,
      tenantId,
      kind: input.kind,
      providerId: input.providerId,
      promptVersion: input.promptVersion,
      createdAt: this.now().toISOString(),
      sourceFacts: sourceFacts.map((fact) => fact.source),
      narrative,
      redactionCount,
      budgetUsed,
      providerMutation: false,
      enforcement: 'not_authorized',
    };
  }
}
