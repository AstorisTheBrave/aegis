# Audit ledger contracts

We define append-only, hash-chained audit records here. The module does not care whether an
adapter stores them in PostgreSQL, exports them to a SIEM, or keeps them in memory for tests.

Every adapter must preserve the returned sequence and chain hashes exactly. Treat a record that
fails `verifyAuditChain` as evidence of an incomplete or altered ledger.
