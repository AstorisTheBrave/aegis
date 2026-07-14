import { describe, expect, it } from 'vitest';

import { CredentialHost } from '../src/index.js';

const key = Buffer.alloc(32, 7).toString('base64');

describe('CredentialHost', () => {
  it('encrypts credentials and resolves only a connector-bound approved lease', () => {
    const host = new CredentialHost(key, () => new Date('2026-07-14T10:00:00.000Z'));
    const encrypted = host.store({
      tenantId: 'tenant-acme',
      connectorId: 'github-cloud',
      scopes: ['members:read'],
      value: { token: 'secret' },
    });
    expect(encrypted.ciphertext).not.toContain('secret');
    const lease = host.issueLease({
      tenantId: 'tenant-acme',
      connectorId: 'github-cloud',
      requiredScopes: ['members:read'],
      ttlSeconds: 60,
    });
    expect(host.resolveLease(lease.token, 'github-cloud')).toEqual({ token: 'secret' });
    expect(() => host.resolveLease(lease.token, 'slack')).toThrow('Credential lease is not valid');
  });

  it('rejects expired or over-privileged leases', () => {
    let time = new Date('2026-07-14T10:00:00.000Z');
    const host = new CredentialHost(key, () => time);
    host.store({
      tenantId: 'tenant-acme',
      connectorId: 'github-cloud',
      scopes: ['members:read'],
      value: { token: 'secret' },
    });
    expect(() =>
      host.issueLease({
        tenantId: 'tenant-acme',
        connectorId: 'github-cloud',
        requiredScopes: ['admin:write'],
        ttlSeconds: 60,
      }),
    ).toThrow('not approved');
    const lease = host.issueLease({
      tenantId: 'tenant-acme',
      connectorId: 'github-cloud',
      requiredScopes: ['members:read'],
      ttlSeconds: 1,
    });
    time = new Date('2026-07-14T10:00:02.000Z');
    expect(() => host.resolveLease(lease.token, 'github-cloud')).toThrow('has expired');
  });
});
