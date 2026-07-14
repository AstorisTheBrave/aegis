# Ecosystem governance

An Aegis connector or policy-pack artifact is a signed, immutable contribution.
Before installation, Aegis verifies its canonical payload digest, signature,
protocol compatibility, platform range, immutable source revision, reproducible
build digest, passing test status, and lifecycle declaration.

## Compatibility and lifecycle

Artifacts declare the connector protocol versions they support and an inclusive
minimum/maximum Aegis platform range. The platform rejects an artifact outside
that range. `active` artifacts install normally. A `deprecated` artifact must
include a reason, effective timestamp, and optional replacement ID. A `retired`
artifact cannot be installed.

Protocol changes are additive only in a new protocol version. A maintained
protocol remains supported until its published deprecation date; security fixes
may still require operators to upgrade a vulnerable artifact.

## Maintainers and review

Maintainers own source provenance, reproducible build evidence, tests, declared
permissions, and deprecation notices. Connector submissions additionally require
fixture certification, a scope review, read-only method inventory, and no-write
proof. Report security concerns through [SECURITY.md](../SECURITY.md), not a
public issue.

The machine-readable support record is
[compatibility-matrix.json](compatibility-matrix.json).
