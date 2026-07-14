CREATE TABLE governance_sync_runs (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  event_count INTEGER,
  error TEXT,
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX governance_sync_runs_tenant_started_idx
  ON governance_sync_runs (tenant_id, started_at DESC);
