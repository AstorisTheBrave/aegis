CREATE TABLE governance_access_requests (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  request JSONB NOT NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX governance_access_requests_tenant_requested_idx ON governance_access_requests (tenant_id, requested_at DESC, id DESC);
