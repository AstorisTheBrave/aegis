import { describe, expect, it } from 'vitest';
import { InMemoryAccessGraphRepository } from '@open-saas-governance/access-graph';
import { createApp } from '../src/app.js';
describe('Aegis API', () =>
  it('serves health and a scoped missing identity response', async () => {
    const app = createApp(new InMemoryAccessGraphRepository());
    expect((await app.inject('/health')).json()).toEqual({ status: 'ok' });
    expect((await app.inject('/v1/tenants/t/identities/nope')).statusCode).toBe(404);
    await app.close();
  }));
