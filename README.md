# Aegis

Aegis gives self-hosted teams a clear view of SaaS access. I collect
identities, resources, entitlements, and grants into one access graph, then use
that graph for explainable findings, access reviews, evidence, discovery, and
governed workflows.

The v1 platform is deliberately read-only. Aegis does not revoke access,
change a provider, or execute a live provider action.

## Start Aegis 1.0.0

Use published release images for a production-style local deployment. The
release Compose file pulls Aegis API and Console images by version; it never
builds an image from your working tree.

```powershell
Copy-Item deploy/env.release.example .env
# Set MASTER_KEY and POSTGRES_PASSWORD in .env.
docker compose -f deploy/compose.release.yaml --env-file .env up --pull always --wait
Invoke-RestMethod http://localhost:3000/ready
```

Open `http://localhost:4173` when the services are healthy. Keep the API on
its loopback default unless you have a specific integration that needs it.

For development, use the source Compose file instead:

```powershell
Copy-Item deploy/env.example .env
docker compose -f deploy/compose.yaml --env-file .env up --build --wait
```

## What v1 includes

- A provider-neutral access graph for identities, resources, entitlements, and grants.
- Read-only connector runtime and maintained provider adapters.
- Explainable findings, evidence exports, reviews, access requests, discovery, and workflow previews.
- Signed connector and policy-pack artifacts with compatibility and lifecycle checks.
- TypeScript, Python, Go, Rust, C, and C++ connector SDKs.

## Compatibility promise

I use [Semantic Versioning](https://semver.org/). The v1 public surface is:

- HTTP routes under `/v1` and their documented request/response contracts.
- The connector protocol v1 manifest, Protobuf service, and maintained SDK APIs.
- The published release Compose contract: `AEGIS_VERSION`, `MASTER_KEY`,
  `POSTGRES_PASSWORD`, and documented host-port variables. Passwords may use
  any characters; the production Compose file passes them to PostgreSQL without
  embedding them in a URL.
- Signed extension artifact and evidence-export formats.

Everything else is internal implementation detail. A compatible addition raises
the minor version; a compatible fix raises the patch version; a breaking change
waits for v2. Once I publish a version, I do not replace it.

Read the [release policy](docs/release-policy.md) for the tag, verification,
image, and provenance rules.

## Run from source

Use Node.js 24 LTS and pnpm 11.

```powershell
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm test:sdks
pnpm build
```

`MASTER_KEY` is a base64-encoded 32-byte key. The API refuses to start without
a valid value.

## Security and operating limits

Aegis ships a same-origin console gateway, a loopback API, and an internal
PostgreSQL service. It does not provide application authentication or
authorization in v1. Put an identity-aware reverse proxy and rate limiting in
front of any deployment that extends beyond a trusted operator network.

Read the [threat model](docs/threat-model.md),
[security policy](SECURITY.md), and [E2E guide](docs/e2e-testing.md) before
you expose Aegis to other people or systems.

## Build with us

I welcome connector, policy-pack, SDK, documentation, and test contributions.
Start with [CONTRIBUTING.md](CONTRIBUTING.md), follow the
[Code of Conduct](CODE_OF_CONDUCT.md), and use the private security reporting
path in [SECURITY.md](SECURITY.md) for vulnerabilities.

## License

The Aegis server is AGPL-3.0-or-later. The connector protocol and SDKs are
Apache-2.0 so that anyone can build compatible connectors without taking a
dependency on the control plane.
