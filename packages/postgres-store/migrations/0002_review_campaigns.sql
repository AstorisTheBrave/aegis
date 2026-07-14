CREATE TABLE governance_review_campaigns (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE governance_review_tasks (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  finding JSONB NOT NULL,
  resource_id TEXT,
  assigned_reviewer TEXT,
  route TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, campaign_id)
    REFERENCES governance_review_campaigns (tenant_id, id)
    ON DELETE CASCADE
);

CREATE TABLE governance_review_task_decisions (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  rationale TEXT NOT NULL,
  delegated_to TEXT,
  exception_expires_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, task_id)
    REFERENCES governance_review_tasks (tenant_id, id)
    ON DELETE CASCADE
);

CREATE INDEX governance_review_tasks_campaign_idx
  ON governance_review_tasks (tenant_id, campaign_id);
CREATE INDEX governance_review_decisions_task_idx
  ON governance_review_task_decisions (tenant_id, task_id, decided_at);
