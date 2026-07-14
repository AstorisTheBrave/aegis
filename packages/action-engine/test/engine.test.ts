import { describe, expect, it } from 'vitest';
import { InMemoryAuditLedger } from '@open-saas-governance/audit-ledger';
import {
  ControlledActionEngine,
  InMemoryActionRepository,
  MockActionAdapter,
} from '../src/index.js';

const input = {
  provider: 'mock-okta' as const,
  kind: 'disable_account' as const,
  target: { subjectId: 'person:alice', displayName: 'Alice Example' },
  requestedBy: 'requester@acme.dev',
  requiredScopes: ['users.disable'],
  idempotencyKey: 'leaver:alice:okta',
  rollbackNarrative: 'Re-enable the mock account and restore assigned groups.',
};

describe('ControlledActionEngine', () => {
  it('requires separation of requester, approver, and executor, while retaining idempotency', async () => {
    const engine = new ControlledActionEngine(
      new InMemoryActionRepository(),
      new InMemoryAuditLedger(),
    );
    const [first, duplicate] = await Promise.all([
      engine.request('acme', input),
      engine.request('acme', input),
    ]);
    expect(duplicate.id).toBe(first.id);
    await expect(
      engine.approve('acme', first.id, { approver: input.requestedBy, reason: 'no' }),
    ).rejects.toThrow('Requester cannot approve');
    await expect(
      engine.approve('acme', first.id, { approver: ' REQUESTER@ACME.DEV ', reason: 'no' }),
    ).rejects.toThrow('Requester cannot approve');
    const approved = await engine.approve('acme', first.id, {
      approver: 'approver@acme.dev',
      reason: 'Validated HRIS offboarding event.',
    });
    await expect(engine.execute('acme', approved.id, 'approver@acme.dev')).rejects.toThrow(
      'must be distinct',
    );
    await expect(engine.execute('acme', approved.id, 'executor@acme.dev')).resolves.toMatchObject({
      status: 'completed',
      providerMutation: false,
    });
  });

  it('records a failed mock action and permits a bounded retry', async () => {
    let failures = 0;
    const engine = new ControlledActionEngine(
      new InMemoryActionRepository(),
      new InMemoryAuditLedger(),
      [
        new MockActionAdapter('mock-okta', ['disable_account'], () => {
          failures += 1;
          return failures === 1;
        }),
      ],
    );
    const action = await engine.request('acme', input);
    await engine.approve('acme', action.id, { approver: 'approver@acme.dev', reason: 'Approved.' });
    const failed = await engine.execute('acme', action.id, 'executor@acme.dev');
    expect(failed.status).toBe('failed');
    await expect(engine.execute('acme', action.id, 'executor@acme.dev')).resolves.toMatchObject({
      status: 'completed',
      executions: expect.arrayContaining([expect.objectContaining({ attempt: 2 })]),
    });
  });

  it('allows a brief, reasoned self-approval only through break-glass', async () => {
    const engine = new ControlledActionEngine(
      new InMemoryActionRepository(),
      new InMemoryAuditLedger(),
      undefined,
      undefined,
      () => new Date('2026-07-14T18:00:00.000Z'),
    );
    const action = await engine.request('acme', input);
    await expect(
      engine.approve('acme', action.id, {
        approver: input.requestedBy,
        reason: 'Emergency incident response.',
        breakGlass: {
          reason: 'Confirmed active account compromise.',
          expiresAt: '2026-07-14T18:10:00.000Z',
        },
      }),
    ).resolves.toMatchObject({ status: 'approved' });
  });

  it('rejects provider and action combinations without a certified allowlist entry', async () => {
    const engine = new ControlledActionEngine(
      new InMemoryActionRepository(),
      new InMemoryAuditLedger(),
    );
    await expect(
      engine.request('acme', { ...input, provider: 'mock-github', kind: 'disable_account' }),
    ).rejects.toThrow('not allowlisted');
  });

  it('applies separation checks to legacy action rows with unnormalized actors', async () => {
    const repository = new InMemoryActionRepository();
    const engine = new ControlledActionEngine(repository, new InMemoryAuditLedger());
    const action = await engine.request('acme', input);
    await repository.save({ ...action, requestedBy: ' Requester@Acme.Dev ' });
    await expect(
      engine.approve('acme', action.id, { approver: 'requester@acme.dev', reason: 'No.' }),
    ).rejects.toThrow('Requester cannot approve');
  });
});
