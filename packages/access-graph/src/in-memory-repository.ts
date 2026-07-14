import type {
  AccessGraphRepository,
  AccessView,
  Entitlement,
  Grant,
  GraphSyncBatch,
  Identity,
  Resource,
} from './model.js';

interface TenantGraph {
  readonly identities: Map<string, Identity>;
  readonly resources: Map<string, Resource>;
  readonly entitlements: Map<string, Entitlement>;
  readonly grants: Map<string, Grant>;
}

function createTenantGraph(): TenantGraph {
  return {
    identities: new Map(),
    resources: new Map(),
    entitlements: new Map(),
    grants: new Map(),
  };
}

export class InMemoryAccessGraphRepository implements AccessGraphRepository {
  readonly #tenants = new Map<string, TenantGraph>();

  async applySync(batch: GraphSyncBatch): Promise<void> {
    const graph = this.#tenants.get(batch.tenantId) ?? createTenantGraph();

    for (const event of batch.events) {
      if (event.entity.tenantId !== batch.tenantId) {
        throw new Error(`Event tenant ${event.entity.tenantId} does not match batch tenant`);
      }

      if (event.entity.connectorId !== batch.connectorId) {
        throw new Error(
          `Event connector ${event.entity.connectorId} does not match batch connector`,
        );
      }

      switch (event.type) {
        case 'identity.upsert':
          graph.identities.set(event.entity.id, event.entity);
          break;
        case 'resource.upsert':
          graph.resources.set(event.entity.id, event.entity);
          break;
        case 'entitlement.upsert':
          if (!graph.resources.has(event.entity.resourceId)) {
            throw new Error(`Entitlement ${event.entity.id} references an unknown resource`);
          }
          graph.entitlements.set(event.entity.id, event.entity);
          break;
        case 'grant.upsert':
          if (!graph.identities.has(event.entity.identityId)) {
            throw new Error(`Grant ${event.entity.id} references an unknown identity`);
          }
          if (!graph.entitlements.has(event.entity.entitlementId)) {
            throw new Error(`Grant ${event.entity.id} references an unknown entitlement`);
          }
          graph.grants.set(event.entity.id, event.entity);
          break;
      }
    }

    this.#tenants.set(batch.tenantId, graph);
  }

  async getIdentity(tenantId: string, identityId: string): Promise<Identity | undefined> {
    return this.#tenants.get(tenantId)?.identities.get(identityId);
  }

  async listIdentities(tenantId: string): Promise<readonly Identity[]> {
    return [...(this.#tenants.get(tenantId)?.identities.values() ?? [])].sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    );
  }

  async listAccessForIdentity(
    tenantId: string,
    identityId: string,
  ): Promise<readonly AccessView[]> {
    const graph = this.#tenants.get(tenantId);
    const identity = graph?.identities.get(identityId);
    if (!graph || !identity) {
      return [];
    }

    return [...graph.grants.values()]
      .filter((grant) => grant.identityId === identityId)
      .map((grant) => {
        const entitlement = graph.entitlements.get(grant.entitlementId);
        if (!entitlement) {
          throw new Error(`Grant ${grant.id} has no entitlement`);
        }
        const resource = graph.resources.get(entitlement.resourceId);
        if (!resource) {
          throw new Error(`Entitlement ${entitlement.id} has no resource`);
        }
        return { identity, entitlement, resource, grant };
      });
  }
}
