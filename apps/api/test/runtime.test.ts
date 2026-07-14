import { describe, expect, it } from 'vitest';
import { parseRuntimeConfig } from '../src/runtime.js';

describe('runtime configuration', () => {
  it('requires a database URL and exactly 32 decoded master-key bytes', () => {
    expect(() => parseRuntimeConfig({ MASTER_KEY: Buffer.alloc(32).toString('base64') })).toThrow(
      'DATABASE_URL is required',
    );
    expect(() =>
      parseRuntimeConfig({ DATABASE_URL: 'postgres://example', MASTER_KEY: 'short' }),
    ).toThrow('MASTER_KEY must decode to exactly 32 bytes');
  });

  it('accepts an explicit self-hosted runtime configuration', () => {
    expect(
      parseRuntimeConfig({
        DATABASE_URL: 'postgres://governance:local@localhost:5432/governance',
        MASTER_KEY: Buffer.alloc(32, 7).toString('base64'),
      }),
    ).toMatchObject({ databaseUrl: 'postgres://governance:local@localhost:5432/governance' });
  });
});
