import { describe, expect, it } from 'vitest';
import { AccessRequestEngine, InMemoryAccessRequestRepository } from '../src/index.js';
const catalog = [
  {
    id: 'github-maintain',
    title: 'GitHub maintain access',
    provider: 'mock-github',
    entitlement: 'maintain',
    reviewer: 'owner@acme.dev',
    maxDurationMinutes: 240,
  },
] as const;
describe('AccessRequestEngine', () => {
  it('routes a bounded request, requires a distinct reviewer, and expires it', async () => {
    let now = new Date('2026-07-14T20:00:00.000Z');
    const e = new AccessRequestEngine(
      new InMemoryAccessRequestRepository(),
      catalog,
      () => now,
      () => '1',
    );
    const r = await e.create('acme', {
      catalogItemId: 'github-maintain',
      requester: 'user@acme.dev',
      rationale: 'Incident work',
      durationMinutes: 60,
      idempotencyKey: 'jit:1',
    });
    await expect(
      e.decide('acme', r.id, { reviewer: 'user@acme.dev', approved: true, reason: 'no' }),
    ).rejects.toThrow('distinct');
    const a = await e.decide('acme', r.id, {
      reviewer: 'owner@acme.dev',
      approved: true,
      reason: 'Approved',
    });
    expect((await e.activate('acme', a.id)).status).toBe('active');
    now = new Date('2026-07-14T21:01:00.000Z');
    expect((await e.list('acme'))[0]?.status).toBe('expired');
  });

  it('expires an approval instead of activating it after its time bound', async () => {
    let now = new Date('2026-07-14T20:00:00.000Z');
    const repository = new InMemoryAccessRequestRepository();
    const e = new AccessRequestEngine(
      repository,
      catalog,
      () => now,
      () => 'expired',
    );
    const r = await e.create('acme', {
      catalogItemId: 'github-maintain',
      requester: 'user@acme.dev',
      rationale: 'Incident work',
      durationMinutes: 1,
      idempotencyKey: 'jit:expired',
    });
    await e.decide('acme', r.id, {
      reviewer: 'owner@acme.dev',
      approved: true,
      reason: 'Approved',
    });
    now = new Date('2026-07-14T20:02:00.000Z');
    await expect(e.activate('acme', r.id)).rejects.toThrow('Expired');
    expect((await repository.get('acme', r.id))?.status).toBe('expired');
  });
});
