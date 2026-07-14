CREATE TABLE governance_controlled_actions (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  action JSONB NOT NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE governance_action_approvals (
  tenant_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  approver TEXT NOT NULL,
  approval JSONB NOT NULL,
  PRIMARY KEY (tenant_id, action_id, approved_at, approver),
  FOREIGN KEY (tenant_id, action_id)
    REFERENCES governance_controlled_actions (tenant_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE governance_action_executions (
  tenant_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  execution JSONB NOT NULL,
  PRIMARY KEY (tenant_id, action_id, attempt),
  FOREIGN KEY (tenant_id, action_id)
    REFERENCES governance_controlled_actions (tenant_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX governance_controlled_actions_tenant_requested_idx
  ON governance_controlled_actions (tenant_id, requested_at DESC, id DESC);
