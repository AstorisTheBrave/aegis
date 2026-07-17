# Data portability and CSV migration

Use `@aegis/migration-kit` to turn a portable access CSV into a deterministic,
read-only graph sync batch. We do not call a provider, accept credentials, or
change source access during migration.

The required headers are `identity_id`, `identity_name`, `provider`,
`resource_id`, `resource_name`, and `entitlement`. Every non-empty row becomes
identity, resource, entitlement, and grant upserts with the caller's tenant,
source reference, and observation time. Unknown CSV columns are ignored and are
never copied into graph attributes.

We return row-numbered errors for invalid input and never create a partial
batch. Keep the source CSV under your own retention controls; Aegis records
only the declared source reference and normalized access facts.

We publish a [benchmark fixture](../fixtures/benchmark/access-export.v1.csv)
for the migration-kit tests. SDK and connector maintainers can use it to verify
compatible export handling.
