# End-to-end and security testing

`pnpm test:e2e` builds a fresh Compose project with an ephemeral 32-byte master
key, waits for every service health check, runs the Playwright suite, and then
removes containers and volumes. It tests the public console gateway at
`http://127.0.0.1:4173` and the loopback-only API at `http://127.0.0.1:3000`.

The suite uses Chromium, Firefox, WebKit, and a mobile Chromium viewport. It
exercises real console/API flows for discovery, catalog ownership, policy
review, workflow preview, action boundaries, access requests, and assistance.
It also probes malformed JSON, oversized payloads, long route parameters,
out-of-range durations, tenant isolation, idempotent retries, approval bypass,
cross-origin requests, and sensitive nested source facts.

Failure artifacts retain Playwright traces, screenshots, videos, HTML reports,
and JUnit output in CI. The suite is deliberately local: it must not be aimed
at any provider, production tenant, or system outside the Compose stack.

See [threat-model.md](threat-model.md) for the trust-boundary and residual-risk
statement that defines what these tests do and do not prove.
