# Data portability and CSV migration

`@aegis/migration-kit` converts a portable access CSV into a deterministic,
read-only graph sync batch. It does not call a provider, accept credentials, or
change source access.

The required headers are `identity_id`, `identity_name`, `provider`,
`resource_id`, `resource_name`, and `entitlement`. Every non-empty row becomes
identity, resource, entitlement, and grant upserts with the caller's tenant,
source reference, and observation time. Unknown CSV columns are ignored and are
never copied into graph attributes.

Invalid input returns row-numbered errors and no partial batch. Keep the source
CSV under your own retention controls; Aegis records only the declared source
reference and normalized access facts.

The public [benchmark fixture](../fixtures/benchmark/access-export.v1.csv) is
used by the migration-kit test suite and may be used by SDK and connector
maintainers to verify compatible export handling.
