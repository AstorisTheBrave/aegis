# Ecosystem governance

An Aegis connector or policy-pack artifact is a signed, immutable contribution.
Before we install one, we verify its canonical payload digest, signature,
protocol compatibility, platform range, immutable source revision, reproducible
build digest, passing test status, and lifecycle declaration.

## Compatibility and lifecycle

Artifacts declare the connector protocol versions they support and an inclusive
minimum/maximum Aegis platform range. We reject an artifact outside that range.
`active` artifacts install normally. A `deprecated` artifact must include a
reason, effective timestamp, and optional replacement ID. We do not install a
`retired` artifact.

We make protocol changes additively in a new protocol version. A maintained
protocol stays supported until its published deprecation date; security fixes
may still require operators to upgrade a vulnerable artifact.

## Maintainers and review

Maintainers own source provenance, reproducible build evidence, tests, declared
permissions, and deprecation notices. We also require fixture certification, a
scope review, a read-only method inventory, and a no-write proof for connector
submissions. Report security concerns through [SECURITY.md](../SECURITY.md),
not a public issue.

Our machine-readable support record is
[compatibility-matrix.json](compatibility-matrix.json).
