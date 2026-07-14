import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000';

test('the Docker console drives every operator surface through the same-origin gateway', async ({
  page,
  request,
}, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const tenantId = 'acme-platform';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const catalog = await request.post(`${apiBaseUrl}/v1/tenants/${tenantId}/apps`, {
    data: {
      id: `e2e-${suffix}`,
      vendorName: `E2E Console ${suffix}`,
      domains: [`e2e-${suffix}.example.test`],
      aliases: [],
      category: 'Testing',
      riskTier: 'low',
      dataClassification: 'internal',
      recommendation: 'monitor',
    },
  });
  expect(catalog.status()).toBe(200);
  const observation = await request.post(
    `${apiBaseUrl}/v1/tenants/${tenantId}/discovery-observations`,
    {
      data: {
        id: `e2e-observation-${suffix}`,
        source: 'sso_log',
        sourceReference: `e2e/${suffix}`,
        vendorName: `E2E Console ${suffix}`,
        domain: `e2e-${suffix}.example.test`,
        observedAt: new Date().toISOString(),
        activityCount: 1,
        identityType: 'service_account',
      },
    },
  );
  expect(observation.status()).toBe(200);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Identities' })).toBeVisible();

  await page.getByRole('button', { name: 'Resources' }).click();
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
  const catalogRow = page.locator('tr', {
    has: page.getByText(`E2E Console ${suffix}`, { exact: true }),
  });
  await expect(catalogRow).toBeVisible();
  await catalogRow.getByLabel(`Owner identity for E2E Console ${suffix}`).fill('owner@e2e.test');
  await catalogRow.getByRole('button', { name: 'Assign' }).click();
  await expect(catalogRow.getByRole('cell', { name: 'owner@e2e.test', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Connectors' }).click();
  await expect(page.getByRole('heading', { name: 'Observation queue' })).toBeVisible();
  await expect(page.getByText(`E2E Console ${suffix}`)).toBeVisible();

  await page.getByRole('button', { name: 'Reviews' }).click();
  await expect(page.getByRole('heading', { name: 'Review recommendations' })).toBeVisible();

  await page.getByRole('button', { name: 'Workflows' }).click();
  await expect(page.getByRole('heading', { name: 'Lifecycle workflow library' })).toBeVisible();
  await page.getByRole('button', { name: 'Preview dry run' }).first().click();
  await expect(page.getByLabel('Dry-run preview')).toContainText('Provider mutation: false');

  await page.getByRole('button', { name: 'Actions' }).click();
  await expect(page.getByRole('heading', { name: 'Approval queue' })).toBeVisible();
  await expect(page.getByLabel('Test tenant activation status')).toContainText(
    'Production providers',
  );

  await page.getByRole('button', { name: 'Access', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Access requests' })).toBeVisible();
  await page.getByRole('button', { name: 'Request GitHub access' }).click();
  await expect(page.getByRole('button', { name: 'Approve', exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Assistant' }).click();
  await expect(page.getByRole('heading', { name: 'Assistant' })).toBeVisible();
  const enable = page.getByRole('button', { name: 'Enable local assistance' });
  if (await enable.isVisible()) await enable.click();
  await page.getByRole('button', { name: 'Generate evidence summary' }).click();
  await expect(page.getByLabel('Generated assistance output')).toContainText(
    'Provider mutation: false',
  );

  expect(errors).toEqual([]);
});
