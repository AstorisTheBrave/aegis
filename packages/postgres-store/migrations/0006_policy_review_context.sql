ALTER TABLE governance_review_tasks
  ADD COLUMN policy JSONB;

CREATE INDEX governance_review_tasks_policy_idx
  ON governance_review_tasks (tenant_id, ((policy ->> 'policyId')))
  WHERE policy IS NOT NULL;
