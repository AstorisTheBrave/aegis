import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000';

test('the Docker gateway applies browser isolation and API responses do not cache', async ({
  request,
}) => {
  const consoleResponse = await request.get('/');
  expect(consoleResponse.status()).toBe(200);
  expect(consoleResponse.headers()).toMatchObject({
    'content-security-policy': expect.stringContaining("default-src 'self'"),
    'cross-origin-opener-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  });

  const apiResponse = await request.get(`${apiBaseUrl}/v1/tenants/e2e-security/identities`, {
    headers: { origin: 'https://untrusted.example' },
  });
  expect(apiResponse.status()).toBe(200);
  expect(apiResponse.headers()).toMatchObject({
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  });
  expect(apiResponse.headers()['access-control-allow-origin']).toBeUndefined();
});

test('the gateway cannot be redirected to a caller-supplied authority', async ({ request }) => {
  const response = await request.get('/api//api:3000/health');
  expect(response.status()).not.toBe(200);
});

test('API validation rejects malformed, oversized, and out-of-bounds input without server errors', async ({
  request,
}) => {
  const tenantId = `e2e-invalid-${Date.now()}`;
  const malformed = await request.fetch(`${apiBaseUrl}/v1/tenants/${tenantId}/access-requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    data: '{',
  });
  expect(malformed.status()).toBe(400);

  const outOfBounds = await request.post(`${apiBaseUrl}/v1/tenants/${tenantId}/access-requests`, {
    data: {
      catalogItemId: 'github-maintain',
      requester: 'operator@e2e.test',
      rationale: 'overflow boundary',
      durationMinutes: Number.MAX_SAFE_INTEGER,
      idempotencyKey: `overflow-${tenantId}`,
    },
  });
  expect(outOfBounds.status()).toBe(400);

  const oversizedThroughGateway = await request.post(`/api/v1/tenants/${tenantId}/assistance`, {
    data: {
      kind: 'evidence_summary',
      providerId: 'aegis-deterministic-local.v1',
      actor: 'operator@e2e.test',
      promptVersion: 'e2e.v1',
      sourceFacts: [
        { id: 'oversized', label: 'x'.repeat(1_100_000), observedAt: new Date().toISOString() },
      ],
    },
  });
  expect(oversizedThroughGateway.status()).toBe(413);

  const longPath = await request.get(`${apiBaseUrl}/v1/tenants/${'x'.repeat(1_000)}/identities`);
  expect(longPath.status()).toBeLessThan(500);
});

test('tenant isolation, workflow boundaries, and assistance redaction hold across the network boundary', async ({
  request,
}, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const tenantA = `e2e-a-${suffix}`;
  const tenantB = `e2e-b-${suffix}`;
  const idempotencyKey = `request-${suffix}`;
  const requestPayload = {
    catalogItemId: 'github-maintain',
    requester: 'requester@e2e.test',
    rationale: 'Verify tenant isolation and approval sequence.',
    durationMinutes: 60,
    idempotencyKey,
  };
  const created = await request.post(`${apiBaseUrl}/v1/tenants/${tenantA}/access-requests`, {
    data: requestPayload,
  });
  expect(created.status()).toBe(200);
  const accessRequest = await created.json();
  expect(accessRequest.simulatedFulfillment.providerMutation).toBe(false);

  const retry = await request.post(`${apiBaseUrl}/v1/tenants/${tenantA}/access-requests`, {
    data: requestPayload,
  });
  expect((await retry.json()).id).toBe(accessRequest.id);
  expect(
    await (await request.get(`${apiBaseUrl}/v1/tenants/${tenantB}/access-requests`)).json(),
  ).toEqual([]);

  const premature = await request.post(
    `${apiBaseUrl}/v1/tenants/${tenantA}/access-requests/${encodeURIComponent(accessRequest.id)}/activate`,
  );
  expect(premature.status()).toBe(400);
  const selfApproval = await request.post(
    `${apiBaseUrl}/v1/tenants/${tenantA}/access-requests/${encodeURIComponent(accessRequest.id)}/decisions`,
    { data: { reviewer: 'requester@e2e.test', approved: true, reason: 'self approval attempt' } },
  );
  expect(selfApproval.status()).toBe(400);
  const approved = await request.post(
    `${apiBaseUrl}/v1/tenants/${tenantA}/access-requests/${encodeURIComponent(accessRequest.id)}/decisions`,
    { data: { reviewer: 'resource-owner@acme.dev', approved: true, reason: 'separate review' } },
  );
  expect(approved.status()).toBe(200);
  const active = await request.post(
    `${apiBaseUrl}/v1/tenants/${tenantA}/access-requests/${encodeURIComponent(accessRequest.id)}/activate`,
  );
  expect((await active.json()).simulatedFulfillment.providerMutation).toBe(false);

  const settings = await request.post(`${apiBaseUrl}/v1/tenants/${tenantA}/assistance/settings`, {
    data: {
      enabled: true,
      allowedProviders: ['aegis-deterministic-local.v1'],
      budgetPerRequest: 400,
      actor: 'operator@e2e.test',
    },
  });
  expect(settings.status()).toBe(200);
  const secret = 'e2e-secret-must-not-leak';
  const assistance = await request.post(`${apiBaseUrl}/v1/tenants/${tenantA}/assistance`, {
    data: {
      kind: 'evidence_summary',
      providerId: 'aegis-deterministic-local.v1',
      actor: 'operator@e2e.test',
      promptVersion: 'e2e.v1',
      sourceFacts: [
        {
          id: 'fact-1',
          label: 'Current inventory',
          observedAt: new Date().toISOString(),
          credentials: { token: secret },
          providerUrl: 'https://untrusted.example/credential-endpoint',
        },
      ],
    },
  });
  expect(assistance.status()).toBe(200);
  const output = await assistance.json();
  expect(JSON.stringify(output)).not.toContain(secret);
  expect(JSON.stringify(output)).not.toContain('credential-endpoint');
  expect(output).toMatchObject({ providerMutation: false, enforcement: 'not_authorized' });
});
