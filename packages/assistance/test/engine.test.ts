import { describe, expect, it } from 'vitest';
import {
  AssistanceEngine,
  InMemoryAssistanceSettingsRepository,
  deterministicLocalProvider,
} from '../src/index.js';
describe('AssistanceEngine', () => {
  it('requires opt-in, preserves citations, redacts secrets, and cannot mutate providers', async () => {
    const engine = new AssistanceEngine(
      new InMemoryAssistanceSettingsRepository(),
      () => new Date('2026-07-14T20:00:00.000Z'),
      () => '1',
    );
    await expect(
      engine.assist('acme', {
        kind: 'evidence_summary',
        providerId: deterministicLocalProvider,
        actor: 'a@acme.dev',
        promptVersion: 'v1',
        sourceFacts: [
          { id: 'f1', label: 'Privileged GitHub grant', observedAt: '2026-07-14T19:00:00.000Z' },
        ],
      }),
    ).rejects.toThrow('disabled');
    await engine.updateSettings('acme', {
      enabled: true,
      allowedProviders: [deterministicLocalProvider],
      budgetPerRequest: 400,
      actor: 'admin@acme.dev',
    });
    const output = await engine.assist('acme', {
      kind: 'evidence_summary',
      providerId: deterministicLocalProvider,
      actor: 'a@acme.dev',
      promptVersion: 'v1',
      instruction: 'token=abc',
      sourceFacts: [
        {
          id: 'f1',
          label: 'Privileged GitHub grant token=abc',
          observedAt: '2026-07-14T19:00:00.000Z',
        },
      ],
    });
    expect(output).toMatchObject({
      providerMutation: false,
      enforcement: 'not_authorized',
      redactionCount: 2,
    });
    expect(output.sourceFacts[0]?.id).toBe('f1');
    expect(output.sourceFacts[0]?.label).toContain('[REDACTED]');
    expect(output.narrative).toContain('[REDACTED]');
  });
});
