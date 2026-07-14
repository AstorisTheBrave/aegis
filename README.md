# Open SaaS Governance

Self-hosted, open-source SaaS access governance. It builds a verifiable graph
of identities, accounts, resources, entitlements, and grants; turns that graph
into explainable access reviews and evidence; and will grow into policy-driven
discovery, lifecycle, and workflow governance.

## First release

The first vertical slice is deliberately **read-only**:

1. Connect a GitHub organization with least-privilege permissions.
2. Inventory people, teams, repositories, roles, and grants.
3. Flag risky access with source-linked rules.
4. Run an access review and export verifiable evidence.

It never revokes access, changes provider configuration, or runs opaque AI
actions.

## Design invariants

- **Modularity above all else:** a feature is a module with a stable interface.
  Cross-cutting changes require a versioned contract, not edits across a
  monolith.
- **Language-neutral extensions:** connectors implement a versioned
  Protobuf/gRPC contract and may be written in any language with Protobuf
  support. Maintained SDKs are convenience layers, never a platform lock-in.
- **Stable dependencies only:** production dependencies must use an official
  stable release. Beta, RC, preview, canary, nightly, and development-snapshot
  releases are forbidden unless a separately approved stable dependency
  requires them.
- **Read-only means read-only:** provider mutation is prohibited by protocol
  capability gates, connector permissions, API routes, and tests.
- **Evidence before automation:** every finding, policy result, decision, and
  future action must trace back to source graph facts and immutable audit data.

## License model

The server is AGPL-3.0-or-later. The connector protocol and generated SDKs will
be Apache-2.0 so the community can build connectors in any language without
being locked into the server's license.

## Local development

Use Node.js 24 LTS and pnpm 11.

```powershell
pnpm install
docker compose -f deploy/compose.yaml up -d
pnpm lint
pnpm typecheck
pnpm test
```

`MASTER_KEY` must be a base64-encoded 32-byte key. The services must refuse to
start when it is absent or invalid.
