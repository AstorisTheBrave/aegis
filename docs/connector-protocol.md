# Connector Protocol v1

Aegis Connector Protocol v1 is how we bring SaaS data into the Access Graph.
It is language-neutral: an OCI-packaged connector implements the versioned
Protobuf service in any language with Protobuf and gRPC support.

## Read-only guarantee

We permit only these v1 capabilities:

- `IDENTITY_READ`
- `ACCESS_GRAPH_READ`
- `USAGE_READ`

Our manifest parser, connector host, API, and conformance tests reject provider
mutation capabilities. A future protocol version must add them explicitly; v1
will never broaden its permissions silently.

## Connector contract

Every connector provides:

1. a strict manifest with provider scopes and a pinned OCI image digest;
2. connection validation without exposing credentials;
3. a streaming sync that emits typed graph events and resumable checkpoints;
4. documented provider rate-limit and partial-failure behavior.

We never treat an absent record from a partial sync as deletion.

## Runtime lifecycle

Our v1 connectors may run full or incremental syncs. Incremental state is
an additive checkpoint containing a provider cursor and/or watermark. A partial
sync returns its latest safe checkpoint and never implies deletion for unseen
objects. Connector HTTP implementations pin requests to the configured HTTPS
provider origin, issue only GET or HEAD requests, and surface throttling or
transient failures with retry guidance.

Our connector packages normalize identities, resources, entitlements, and
grants while preserving provider source and observation time on every event.
Provider-specific authentication, including AWS signing and Kubernetes cluster
credentials, belongs in each connector adapter, never in our shared runtime.
