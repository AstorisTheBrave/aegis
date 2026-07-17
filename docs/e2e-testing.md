# End-to-end and security testing

`pnpm test:e2e` builds our Compose project with an ephemeral 32-byte master
key, waits for each service to become healthy, runs the Playwright suite, then
removes containers and volumes. We test the public console gateway at
`http://127.0.0.1:4173` and the loopback-only API at `http://127.0.0.1:3000`.

We run the suite in Chromium, Firefox, WebKit, and a mobile Chromium viewport.
It exercises real console/API flows for discovery, catalog ownership, policy
review, workflow preview, action boundaries, access requests, and assistance.
We also probe malformed JSON, oversized payloads, long route parameters,
out-of-range durations, tenant isolation, idempotent retries, approval bypass,
cross-origin requests, and sensitive nested source facts.

CI retains Playwright traces, screenshots, videos, HTML reports, and JUnit
output when a run fails. The suite is deliberately local; do not aim it at a
provider, production tenant, or any system outside the Compose stack.

Read [threat-model.md](threat-model.md) for the trust boundaries and residual
risk that define what these tests do and do not prove.
