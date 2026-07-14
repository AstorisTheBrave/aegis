CREATE TABLE governance_identities (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, connector_id, external_id)
);

CREATE TABLE governance_resources (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  parent_resource_id TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, connector_id, external_id),
  FOREIGN KEY (tenant_id, parent_resource_id)
    REFERENCES governance_resources (tenant_id, id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE governance_entitlements (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  entitlement_type TEXT NOT NULL,
  privileged BOOLEAN NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, connector_id, external_id),
  FOREIGN KEY (tenant_id, resource_id)
    REFERENCES governance_resources (tenant_id, id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE governance_grants (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  entitlement_id TEXT NOT NULL,
  grant_type TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  observed_at TIMESTAMPTZ NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, connector_id, external_id),
  FOREIGN KEY (tenant_id, identity_id)
    REFERENCES governance_identities (tenant_id, id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (tenant_id, entitlement_id)
    REFERENCES governance_entitlements (tenant_id, id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX governance_grants_identity_idx ON governance_grants (tenant_id, identity_id);
CREATE INDEX governance_grants_entitlement_idx ON governance_grants (tenant_id, entitlement_id);

CREATE TABLE governance_connector_syncs (
  tenant_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  event_count INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, connector_id, completed_at)
);

CREATE TABLE governance_audit_entries (
  tenant_id TEXT NOT NULL,
  sequence BIGINT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  actor TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  correlation_id TEXT,
  previous_hash TEXT,
  hash TEXT NOT NULL,
  PRIMARY KEY (tenant_id, sequence)
);
