# Aegis

Aegis is a self-hosted, open-source shield for SaaS access governance. It
builds a verifiable graph of identities, accounts, resources, entitlements,
and grants; turns that graph into explainable access reviews and evidence; and
will grow into policy-driven discovery, lifecycle, and workflow governance.

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
pnpm lint
pnpm typecheck
pnpm test
```

`MASTER_KEY` must be a base64-encoded 32-byte key. The services must refuse to
start when it is absent or invalid.

## Self-hosted Phase 1

Create a local environment file from `deploy/env.example`, generate a unique
`MASTER_KEY`, then start the database and API together:

```powershell
Copy-Item deploy/env.example .env
# Set MASTER_KEY in .env to a base64-encoded, random 32-byte value.
docker compose -f deploy/compose.yaml --env-file .env up --build --wait
Invoke-RestMethod http://localhost:3000/ready
```

The API applies its append-only database migrations before it listens. A
successful readiness response means PostgreSQL, the graph store, campaign
store, audit ledger, and evidence export are available. Stop the local stack
with `docker compose -f deploy/compose.yaml --env-file .env down`.

### GitHub inventory permissions

The GitHub connector only calls organization, team, repository, and
collaborator **read** endpoints. Install it with the least privilege needed to
read organization members, teams, repository metadata, and collaborators; do
not grant any write, administration, workflow, or content permissions. Its
manifest and tests reject provider-mutation capabilities.

### Operating safely

- Back up PostgreSQL with your normal encrypted `pg_dump` workflow before an
  upgrade; restore into a fresh PostgreSQL instance, point `DATABASE_URL` at
  it, and let Aegis verify its migration ledger.
- Rotate `MASTER_KEY` only through a planned credential re-encryption change.
  Phase 1 validates the key at startup and never places it in exported
  evidence, logs, or API responses.
- Upgrade a connector only after reviewing its declared read scopes, pinned
  source revision or digest, fixture coverage, and no-write test evidence.
- Campaign evidence is portable JSON. Verify it offline with
  `verifyCampaignEvidence` from `@aegis/evidence-export`; any changed file or
  manifest field invalidates its SHA-256 verification result.

## Community policy packs and connectors

Policies are deterministic modules over the normalized access graph. A policy
pack must identify its source facts, produce stable finding IDs, avoid network
calls during evaluation, and provide fixtures for every rule. Connectors use
the versioned protocol contract, declare only read capabilities in Phase 1,
and must prove that no route or token can mutate a provider.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the review requirements and public
templates for submitting a connector or policy pack.

## Phase 2 extension ecosystem

Extensions are portable, signed artifacts. A connector contribution supplies a
v1 manifest, redacted fixture bundle, declared scopes/endpoints, a named scope
review, and a read-only certification report; a policy-pack contribution
supplies versioned, source-linked rule descriptors. The API verifies the artifact's canonical
SHA-256 digest and Ed25519 signature before it stores anything.

The maintained provider catalog currently identifies Google Workspace, Slack,
Microsoft Entra ID, GitLab, Okta, AWS IAM, Atlassian Cloud, and Notion as
read-only implementation targets. Those entries are intentionally marked as
profiles until a concrete connector is certified against a provider test tenant.
They are not claims of a live production integration.

Use `pnpm test:sdks` to validate the protocol-only TypeScript, Go, Python, and
Rust SDK seeds. They contain no provider mutation capability and no dependency
on the Aegis control plane.

## Test-tenant provider certification

Controlled actions are exercised only through the maintained mock providers.
Before a configured runtime executes or compensates an approved mock action,
the tenant must hold an unexpired `test` activation that declares the exact
provider, action kinds, and scopes. Certification records combine that
activation with a redacted read-only fixture and scope-limited action probes.

The API does not accept provider credentials, arbitrary provider URLs, or a
production environment selector for this flow. Every activation,
certification, and action record remains auditable and explicitly reports
`providerMutation: false`.

## Time-bound access requests

The access-request module accepts a bounded, idempotent self-service request,
routes it to a distinct resource owner, and records approval or denial in the
audit ledger. Approved requests are time-bound and expire automatically. The
current fulfillment state is deliberately simulated: it requires the existing
controlled-action path and explicitly reports `providerMutation: false`.

## Grounded assistance

The assistance module is optional and disabled by default. Its initial local,
deterministic provider produces source-linked evidence summaries, recommendation
drafts, and workflow drafts under a tenant-controlled request budget. Every
output records its prompt version, source facts, redaction count, and the
explicit `providerMutation: false` / `enforcement: not_authorized` boundary.

The API rejects provider credentials and arbitrary provider URLs. This release
establishes the versioned provider seam for future local or bring-your-own
adapters; it does not connect to external model providers, and generated output
never approves, revokes, or executes an action.

## Durable ecosystem and portability

Community extensions are signed artifacts with an immutable source revision,
reproducible build digest, passing test status, declared platform/protocol
compatibility, named maintainer, and active/deprecated/retired lifecycle. Aegis
rejects incompatible or retired artifacts before installation and exposes safe
catalog metadata such as permissions and certification state.

See [ecosystem governance](docs/ecosystem-governance.md), the public
[compatibility matrix](docs/compatibility-matrix.json), and the
[CSV portability guide](docs/data-portability.md). The CSV migration kit is
read-only: it converts an export to graph events and never contacts a provider.
