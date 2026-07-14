CREATE TABLE governance_test_tenant_activations (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  provider TEXT NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  activation JSONB NOT NULL,
  PRIMARY KEY (tenant_id, id),
  CHECK (expires_at > activated_at)
);

CREATE INDEX governance_test_tenant_activations_tenant_provider_idx
  ON governance_test_tenant_activations (tenant_id, provider, activated_at DESC, id DESC);

CREATE TABLE governance_provider_certifications (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  activation_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  certified_at TIMESTAMPTZ NOT NULL,
  certification JSONB NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, activation_id)
    REFERENCES governance_test_tenant_activations (tenant_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX governance_provider_certifications_tenant_provider_idx
  ON governance_provider_certifications (tenant_id, provider, certified_at DESC, id DESC);
