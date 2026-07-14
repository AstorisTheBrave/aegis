CREATE TABLE governance_workflow_definitions (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  definition JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE governance_workflow_executions (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  definition_id TEXT NOT NULL,
  execution JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, definition_id)
    REFERENCES governance_workflow_definitions (tenant_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX governance_workflow_executions_tenant_created_idx
  ON governance_workflow_executions (tenant_id, created_at DESC, id DESC);
