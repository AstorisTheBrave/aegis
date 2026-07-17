# Contributing to Aegis

I welcome focused contributions that make Aegis safer, clearer, or more useful.
Open an issue before beginning a large change so we can agree on the boundary.

## What I ask for

- Keep changes modular. Add or extend a stable contract before coupling modules.
- Use stable dependencies only; no beta, preview, RC, canary, or nightly releases.
- Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm test:sdks`, and `pnpm build` before opening a pull request.
- Add focused tests and fixtures with every behavioral change.
- Keep public documentation direct, specific, and free of unsupported claims.

## Connector and policy-pack contributions

Connectors in v1 are read-only. Show every provider scope and endpoint, use
only `GET` or `HEAD`, and include a redacted fixture plus a no-write proof.
Never add credentials or personal data to fixtures.

Policy packs must be deterministic, source-linked, and network-free during
evaluation. Use stable rule IDs and include the graph facts each rule needs.

## Publishing an extension

1. Start with a protocol-only SDK in `sdks/`.
2. Redact recorded fixture exchanges with `@aegis/connector-test-kit`.
3. Declare scopes, endpoints, compatibility, and a named scope review.
4. Sign the canonical artifact with an Ed25519 maintainer key.
5. Include source revision, reproducible build digest, test evidence, lifecycle
   state, and the no-write proof in the pull request.

Do not describe a provider as live-certified until it has passed a documented
test-tenant certification run.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities
through [SECURITY.md](SECURITY.md), not in a public issue.
