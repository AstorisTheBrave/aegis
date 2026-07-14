# Audit ledger contracts

This module defines append-only, hash-chained audit records. It does not know whether records are
stored in PostgreSQL, exported to a SIEM, or kept in memory for tests.

Every adapter must preserve the returned sequence and chain hashes exactly. A record failing
`verifyAuditChain` is evidence of an incomplete or altered ledger.
