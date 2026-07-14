# Security policy

Please report suspected vulnerabilities privately through GitHub's repository
security advisory flow. Include affected version, reproduction details, impact,
and any relevant logs with credentials removed.

Do not open a public issue for a vulnerability before maintainers have had a
reasonable opportunity to investigate and ship a fix.

## Security boundaries

Aegis Phase 1 is read-only by design. A finding, review decision, or removal
recommendation must not mutate a connected provider. Credentials and master
keys must never be included in issues, test fixtures, logs, or evidence
exports.
