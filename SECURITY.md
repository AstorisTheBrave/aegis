# Security policy

## Supported versions

| Version                         | Support             |
| ------------------------------- | ------------------- |
| Latest stable release           | Yes                 |
| `main`                          | Yes, before release |
| Older releases and pre-releases | No                  |

## Report a vulnerability

Use GitHub's private [Report a vulnerability](https://github.com/AstorisTheBrave/aegis/security/advisories/new)
flow. Include the affected version or commit, a safe reproduction, impact, and
redacted logs if they help.

Do not open a public issue, publish an exploit, or include credentials, tokens,
customer data, or master keys. I will acknowledge valid reports, investigate
privately, coordinate a fix, and publish an advisory when a remedy is available.
Credit is optional and always up to the reporter.

## v1 security boundary

Aegis v1 supports read-only discovery, policy evaluation, evidence export,
reviews, and simulated controlled actions. It does not authenticate end users,
accept arbitrary provider URLs, or perform live provider mutations. Deploy it
behind an identity-aware reverse proxy and keep database, backups, and secrets
under your own operational controls.

Read the [threat model](docs/threat-model.md) for the implementation-specific
controls and residual risks.
