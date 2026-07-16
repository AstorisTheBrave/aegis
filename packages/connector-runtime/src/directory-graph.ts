import type { GraphSyncBatch, GraphSyncEvent } from '@open-saas-governance/access-graph';
import type { DirectoryGroup, DirectoryIdentity, DirectoryMembership } from './index.js';

export function buildDirectoryGraph(input: {
  tenantId: string;
  connectorId: string;
  source: string;
  observedAt: string;
  identities: readonly DirectoryIdentity[];
  groups: readonly DirectoryGroup[];
  memberships: readonly DirectoryMembership[];
}): GraphSyncBatch {
  const events: GraphSyncEvent[] = [];
  for (const identity of input.identities) {
    events.push({
      type: 'identity.upsert',
      entity: {
        kind: 'identity',
        tenantId: input.tenantId,
        id: `${input.connectorId}:identity:${identity.id}`,
        connectorId: input.connectorId,
        externalId: identity.id,
        displayName: identity.displayName,
        ...(identity.email ? { email: identity.email } : {}),
        identityType: identity.identityType ?? 'human',
        status: identity.active === false ? 'SUSPENDED' : 'ACTIVE',
        observedAt: input.observedAt,
        attributes: { source: input.source, ...(identity.attributes ?? {}) },
      },
    });
  }
  for (const group of input.groups) {
    const resourceId = `${input.connectorId}:group:${group.id}`;
    events.push({
      type: 'resource.upsert',
      entity: {
        kind: 'resource',
        tenantId: input.tenantId,
        id: resourceId,
        connectorId: input.connectorId,
        externalId: group.id,
        displayName: group.displayName,
        resourceType: 'group',
        observedAt: input.observedAt,
        attributes: { source: input.source, ...(group.attributes ?? {}) },
      },
    });
    events.push({
      type: 'entitlement.upsert',
      entity: {
        kind: 'entitlement',
        tenantId: input.tenantId,
        id: `${resourceId}:member`,
        connectorId: input.connectorId,
        externalId: `${group.id}:member`,
        displayName: 'member',
        resourceId,
        entitlementType: 'group-membership',
        privileged: group.privileged ?? false,
        observedAt: input.observedAt,
        attributes: { source: input.source },
      },
    });
  }
  for (const membership of input.memberships) {
    const entitlementId = `${input.connectorId}:group:${membership.groupId}:member`;
    events.push({
      type: 'grant.upsert',
      entity: {
        kind: 'grant',
        tenantId: input.tenantId,
        id: `${entitlementId}:identity:${membership.identityId}`,
        connectorId: input.connectorId,
        externalId: `${membership.groupId}:${membership.identityId}`,
        identityId: `${input.connectorId}:identity:${membership.identityId}`,
        entitlementId,
        grantType: membership.grantType ?? 'DIRECT',
        observedAt: input.observedAt,
        attributes: { source: input.source, accessPath: 'group-membership' },
      },
    });
  }
  return {
    tenantId: input.tenantId,
    connectorId: input.connectorId,
    startedAt: input.observedAt,
    completedAt: input.observedAt,
    events,
  };
}
