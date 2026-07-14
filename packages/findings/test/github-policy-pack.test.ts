import { describe, expect, it } from 'vitest';
import { evaluateGitHubPolicyPack } from '../src/index.js';

const observedAt = '2026-01-01T00:00:00.000Z';
const admin = {
  kind: 'identity',
  tenantId: 'acme',
  id: 'github:user:admin',
  connectorId: 'github-cloud',
  externalId: '1',
  displayName: 'Admin',
  status: 'ACTIVE',
  observedAt,
  attributes: { organizationRole: 'admin' },
} as const;
const collaborator = {
  kind: 'identity',
  tenantId: 'acme',
  id: 'github:user:outside',
  connectorId: 'github-cloud',
  externalId: '2',
  displayName: 'Outside',
  status: 'ACTIVE',
  observedAt,
  attributes: { outsideCollaborator: true, lastActivityAt: '2025-01-01T00:00:00.000Z' },
} as const;
const organization = {
  kind: 'resource',
  tenantId: 'acme',
  id: 'github:org:acme',
  connectorId: 'github-cloud',
  externalId: 'acme',
  displayName: 'acme',
  resourceType: 'organization',
  observedAt,
  attributes: {},
} as const;
const repository = {
  kind: 'resource',
  tenantId: 'acme',
  id: 'github:repo:1',
  connectorId: 'github-cloud',
  externalId: '1',
  displayName: 'acme/aegis',
  resourceType: 'repository',
  observedAt,
  attributes: {},
} as const;
const adminAccess = {
  identity: admin,
  resource: organization,
  entitlement: {
    kind: 'entitlement',
    tenantId: 'acme',
    id: 'github:org:acme:role:admin',
    connectorId: 'github-cloud',
    externalId: 'admin',
    displayName: 'admin',
    resourceId: organization.id,
    entitlementType: 'organization-role',
    privileged: true,
    observedAt,
    attributes: {},
  },
  grant: {
    kind: 'grant',
    tenantId: 'acme',
    id: 'github:grant:admin',
    connectorId: 'github-cloud',
    externalId: 'admin',
    identityId: admin.id,
    entitlementId: 'github:org:acme:role:admin',
    grantType: 'DIRECT',
    observedAt,
    attributes: {},
  },
} as const;
const outsideAccess = {
  identity: collaborator,
  resource: repository,
  entitlement: {
    kind: 'entitlement',
    tenantId: 'acme',
    id: 'github:repo:1:role:maintain',
    connectorId: 'github-cloud',
    externalId: 'maintain',
    displayName: 'maintain',
    resourceId: repository.id,
    entitlementType: 'repository-role',
    privileged: true,
    observedAt,
    attributes: {},
  },
  grant: {
    kind: 'grant',
    tenantId: 'acme',
    id: 'github:grant:outside',
    connectorId: 'github-cloud',
    externalId: 'outside',
    identityId: collaborator.id,
    entitlementId: 'github:repo:1:role:maintain',
    grantType: 'DIRECT',
    observedAt,
    attributes: {},
  },
} as const;

describe('GitHub policy pack', () => {
  it('emits explainable admin, collaborator, stale, unowned, and direct-grant findings', async () => {
    const graph = {
      async listIdentities() {
        return [admin, collaborator];
      },
      async listResources() {
        return [organization, repository];
      },
      async listAccess() {
        return [adminAccess, outsideAccess];
      },
    } as never;

    const findings = await evaluateGitHubPolicyPack(
      graph,
      'acme',
      new Date('2026-07-14T00:00:00.000Z'),
    );

    expect(findings.map((finding) => finding.type)).toEqual([
      'DIRECT_GRANT_DRIFT',
      'ORG_ADMIN',
      'OUTSIDE_COLLABORATOR',
      'STALE_ACCESS',
      'UNOWNED_REPOSITORY',
    ]);
    expect(findings).toContainEqual(
      expect.objectContaining({
        type: 'OUTSIDE_COLLABORATOR',
        evidence: expect.objectContaining({
          identityId: collaborator.id,
          grantId: outsideAccess.grant.id,
        }),
        sourceFacts: expect.arrayContaining([
          expect.objectContaining({ kind: 'grant', id: outsideAccess.grant.id }),
        ]),
      }),
    );
  });
});
