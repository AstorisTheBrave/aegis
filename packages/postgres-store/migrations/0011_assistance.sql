CREATE TABLE governance_assistance_settings (
  tenant_id TEXT PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL,
  settings JSONB NOT NULL
);
