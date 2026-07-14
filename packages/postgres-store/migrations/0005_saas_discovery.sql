CREATE TABLE IF NOT EXISTS governance_saas_catalog_applications (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS governance_saas_catalog_name_idx
  ON governance_saas_catalog_applications (tenant_id, normalized_name);

CREATE TABLE IF NOT EXISTS governance_discovery_observations (
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('idp', 'finance', 'sso_log', 'browser_extension', 'endpoint_inventory', 'email_domain', 'api_token_inventory')),
  id TEXT NOT NULL,
  normalized_vendor_name TEXT NOT NULL,
  normalized_domain TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  activity_count INTEGER NOT NULL CHECK (activity_count >= 0),
  payload JSONB NOT NULL,
  PRIMARY KEY (tenant_id, source, id)
);

CREATE INDEX IF NOT EXISTS governance_discovery_lookup_idx
  ON governance_discovery_observations (tenant_id, normalized_domain, normalized_vendor_name);
