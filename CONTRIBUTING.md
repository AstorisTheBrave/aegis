# Contributing to Aegis

Thanks for helping make SaaS access governance transparent and portable.

## Contribution rules

- Keep features modular: define or extend a stable contract before coupling
  packages.
- Use only stable dependency releases. Do not add beta, preview, RC, nightly,
  or canary releases.
- Include focused fixtures and tests for every connector and policy change.
- Phase 1 connectors may only declare and use read capabilities. Show the
  exact provider scopes, all called endpoints, and a no-write proof.
- Policy packs must be deterministic, source-linked, and network-free during
  evaluation. Do not use credentials or personal data in fixtures.
- Preserve the evidence chain: graph facts, findings, review records, and
  audit data must remain traceable.

Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`
before opening a pull request.
