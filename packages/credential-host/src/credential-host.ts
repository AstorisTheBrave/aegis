import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export interface CredentialRecord {
  readonly tenantId: string;
  readonly connectorId: string;
  readonly scopes: readonly string[];
  readonly value: Readonly<Record<string, string>>;
}

export interface EncryptedCredentialRecord {
  readonly tenantId: string;
  readonly connectorId: string;
  readonly scopes: readonly string[];
  readonly iv: string;
  readonly ciphertext: string;
  readonly tag: string;
}

export interface CredentialLease {
  readonly token: string;
  readonly expiresAt: string;
}

interface LeasePayload {
  readonly tenantId: string;
  readonly connectorId: string;
  readonly scopes: readonly string[];
  readonly expiresAt: string;
}

export class CredentialHost {
  readonly #encryptionKey: Buffer;
  readonly #leaseKey: Buffer;
  readonly #records = new Map<string, EncryptedCredentialRecord>();

  constructor(
    masterKeyBase64: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.#encryptionKey = Buffer.from(masterKeyBase64, 'base64');
    if (this.#encryptionKey.length !== 32) {
      throw new Error('Credential host master key must decode to exactly 32 bytes');
    }
    this.#leaseKey = createHmac('sha256', this.#encryptionKey)
      .update('credential-lease-v1')
      .digest();
  }

  store(record: CredentialRecord): EncryptedCredentialRecord {
    if (record.scopes.length === 0) {
      throw new Error('Credential records require at least one approved scope');
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.#encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(record.value), 'utf8'),
      cipher.final(),
    ]);
    const encrypted = {
      tenantId: record.tenantId,
      connectorId: record.connectorId,
      scopes: [...new Set(record.scopes)].sort(),
      iv: iv.toString('base64url'),
      ciphertext: ciphertext.toString('base64url'),
      tag: cipher.getAuthTag().toString('base64url'),
    };
    this.#records.set(this.#recordKey(record.tenantId, record.connectorId), encrypted);
    return encrypted;
  }

  issueLease(input: {
    tenantId: string;
    connectorId: string;
    requiredScopes: readonly string[];
    ttlSeconds: number;
  }): CredentialLease {
    if (input.ttlSeconds <= 0 || input.ttlSeconds > 900) {
      throw new Error('Credential leases must expire between 1 and 900 seconds');
    }
    const record = this.#records.get(this.#recordKey(input.tenantId, input.connectorId));
    if (!record || !input.requiredScopes.every((scope) => record.scopes.includes(scope))) {
      throw new Error('Connector is not approved for every requested credential scope');
    }
    const payload: LeasePayload = {
      tenantId: input.tenantId,
      connectorId: input.connectorId,
      scopes: [...input.requiredScopes].sort(),
      expiresAt: new Date(this.now().getTime() + input.ttlSeconds * 1000).toISOString(),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return { token: `${encoded}.${this.#signature(encoded)}`, expiresAt: payload.expiresAt };
  }

  resolveLease(token: string, connectorId: string): Readonly<Record<string, string>> {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature || !this.#hasValidSignature(encoded, signature)) {
      throw new Error('Credential lease signature is invalid');
    }
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as LeasePayload;
    if (payload.connectorId !== connectorId || new Date(payload.expiresAt) <= this.now()) {
      throw new Error('Credential lease is not valid for this connector or has expired');
    }
    const record = this.#records.get(this.#recordKey(payload.tenantId, payload.connectorId));
    if (!record || !payload.scopes.every((scope) => record.scopes.includes(scope))) {
      throw new Error('Credential lease no longer has an approved backing record');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.#encryptionKey,
      Buffer.from(record.iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(record.tag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(record.ciphertext, 'base64url')),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as Readonly<Record<string, string>>;
  }

  #recordKey(tenantId: string, connectorId: string): string {
    return `${tenantId}:${connectorId}`;
  }

  #signature(encoded: string): string {
    return createHmac('sha256', this.#leaseKey).update(encoded).digest('base64url');
  }

  #hasValidSignature(encoded: string, signature: string): boolean {
    const expected = Buffer.from(this.#signature(encoded));
    const received = Buffer.from(signature);
    return expected.length === received.length && timingSafeEqual(expected, received);
  }
}
