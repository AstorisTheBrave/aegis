# Contributing to Aegis

Thanks for helping make SaaS access governance transparent and portable.

## Contribution rules

- Keep features modular: define or extend a stable contract before coupling
  packages.
- Use only stable dependency releases. Do not add beta, preview, RC, nightly,
  or canary releases.
- Include focused fixtures and tests for every connector and policy change.
- Connectors may only declare and use read capabilities. Show the
  exact provider scopes, all called endpoints, and a no-write proof.
- Policy packs must be deterministic, source-linked, and network-free during
  evaluation. Do not use credentials or personal data in fixtures.
- Preserve the evidence chain: graph facts, findings, review records, and
  audit data must remain traceable.

## Publishing an extension

1. Start from one of the protocol-only SDK seeds in `sdks/`.
2. Record fixture exchanges, run them through `@aegis/connector-test-kit`, and
   retain only the redacted fixture artifact.
3. Certify a connector with only `GET` or `HEAD` exchanges, declared read
   scopes/endpoints, a named scope review, and a pinned OCI image digest. Do not claim live
   certification without a provider test tenant.
4. Canonically digest and sign the extension with an Ed25519 maintainer key.
   The self-hosted API verifies both before installation at `POST /v1/extensions`.
5. Include the signed artifact, supported protocol/platform range, immutable
   source revision, reproducible build digest, passing test timestamp, lifecycle
   state, maintainer contact, and a focused no-write test in the pull request.

Policy packs must use stable rule IDs, state their required graph facts, and
include deterministic fixtures. A policy evaluation must not make a network
call.

Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:sdks`, and `pnpm build`
before opening a pull request.
