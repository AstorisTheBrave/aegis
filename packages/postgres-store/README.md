# PostgreSQL storage adapter

This is a storage adapter, not the access-graph domain. It implements the public graph and audit
ledger contracts against PostgreSQL 18. Other storage or evidence-export adapters can coexist
without changing the API, policy, or connector modules.

Run the ordered SQL files in `migrations/` with a migration runner before creating the adapter.
