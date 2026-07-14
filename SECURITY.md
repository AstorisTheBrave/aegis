# Security policy

## Supported versions

| Version                               | Supported |
| ------------------------------------- | --------- |
| `main`                                | Yes       |
| Latest published release              | Yes       |
| Older releases and pre-release builds | No        |

## Reporting a vulnerability

Use GitHub's private [Report a vulnerability](https://github.com/AstorisTheBrave/aegis/security/advisories/new) flow. Include the affected version or commit, a safe reproduction, expected impact, and any relevant redacted logs.

Do not open a public issue, publish an exploit, or include credentials, tokens, customer data, or master keys before maintainers have had a reasonable opportunity to investigate and ship a fix.

## Security boundaries

Aegis is designed for read-only discovery, policy evaluation, evidence export, and review workflows. Findings, review decisions, and removal recommendations must not mutate a connected provider. Connectors and extensions must declare their scopes and endpoints; any future write capability requires explicit protocol support, documentation, and tests.

Credentials and master keys must never be included in issues, test fixtures, logs, or evidence exports. Treat extension artifacts, provider payloads, policy inputs, and exported evidence as untrusted data.

## Handling reports

Maintainers will acknowledge valid reports, coordinate fixes privately, and publish an advisory when a fix is available. Credit is given to reporters who want it and whose reports are handled under coordinated disclosure.
