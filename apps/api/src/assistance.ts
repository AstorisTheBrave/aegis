import {
  AssistanceEngine,
  deterministicLocalProvider,
  type AssistanceRequest,
  type AssistanceSettingsRepository,
  type UpdateAssistanceSettingsInput,
} from '@aegis/assistance';
import type { AuditLedger } from '@open-saas-governance/audit-ledger';
export class AssistanceManager {
  readonly #engine: AssistanceEngine;
  constructor(
    repository: AssistanceSettingsRepository,
    private readonly audit: AuditLedger,
    now: () => Date = () => new Date(),
  ) {
    this.#engine = new AssistanceEngine(repository, now);
  }
  settings(tenantId: string) {
    return this.#engine.settings(tenantId);
  }
  async updateSettings(tenantId: string, input: UpdateAssistanceSettingsInput) {
    const settings = await this.#engine.updateSettings(tenantId, input);
    await this.audit.append({
      tenantId,
      occurredAt: settings.updatedAt,
      actor: settings.updatedBy,
      type: 'assistance.settings_updated',
      correlationId: tenantId,
      data: { settings, providerMutation: false },
    });
    return settings;
  }
  async assist(tenantId: string, input: AssistanceRequest) {
    const output = await this.#engine.assist(tenantId, input);
    await this.audit.append({
      tenantId,
      occurredAt: output.createdAt,
      actor: input.actor.trim().toLowerCase(),
      type: 'assistance.output_generated',
      correlationId: output.id,
      data: { output, providerMutation: false },
    });
    return output;
  }
}
export { deterministicLocalProvider };
