CREATE TABLE IF NOT EXISTS governance_extensions (
  kind TEXT NOT NULL CHECK (kind IN ('connector', 'policy-pack')),
  id TEXT NOT NULL,
  version TEXT NOT NULL,
  payload JSONB NOT NULL,
  digest TEXT NOT NULL,
  public_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kind, id, version)
);

CREATE INDEX IF NOT EXISTS governance_extensions_catalog_idx
  ON governance_extensions (kind, id, version);
