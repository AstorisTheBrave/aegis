export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface GraphEntityBase {
  readonly tenantId: string;
  readonly id: string;
  readonly connectorId: string;
  readonly externalId: string;
  readonly observedAt: string;
  readonly attributes: JsonObject;
}

export interface Identity extends GraphEntityBase {
  readonly kind: 'identity';
  readonly displayName: string;
  readonly email?: string;
  readonly status: 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'UNKNOWN';
}

export interface Resource extends GraphEntityBase {
  readonly kind: 'resource';
  readonly displayName: string;
  readonly resourceType: string;
  readonly parentResourceId?: string;
}

export interface Entitlement extends GraphEntityBase {
  readonly kind: 'entitlement';
  readonly displayName: string;
  readonly resourceId: string;
  readonly entitlementType: string;
  readonly privileged: boolean;
}

export interface Grant extends GraphEntityBase {
  readonly kind: 'grant';
  readonly identityId: string;
  readonly entitlementId: string;
  readonly grantType: 'DIRECT' | 'GROUP' | 'INHERITED' | 'UNKNOWN';
  readonly expiresAt?: string;
}

export type GraphEntity = Identity | Resource | Entitlement | Grant;

export type GraphSyncEvent =
  | { readonly type: 'identity.upsert'; readonly entity: Identity }
  | { readonly type: 'resource.upsert'; readonly entity: Resource }
  | { readonly type: 'entitlement.upsert'; readonly entity: Entitlement }
  | { readonly type: 'grant.upsert'; readonly entity: Grant };

export interface GraphSyncBatch {
  readonly tenantId: string;
  readonly connectorId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly events: readonly GraphSyncEvent[];
}

export interface AccessView {
  readonly identity: Identity;
  readonly entitlement: Entitlement;
  readonly resource: Resource;
  readonly grant: Grant;
}

export interface AccessGraphRepository {
  applySync(batch: GraphSyncBatch): Promise<void>;
  listIdentities(tenantId: string): Promise<readonly Identity[]>;
  listResources(tenantId: string): Promise<readonly Resource[]>;
  listAccess(tenantId: string): Promise<readonly AccessView[]>;
  getIdentity(tenantId: string, identityId: string): Promise<Identity | undefined>;
  listAccessForIdentity(tenantId: string, identityId: string): Promise<readonly AccessView[]>;
}
