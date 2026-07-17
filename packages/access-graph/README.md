# Access graph contracts

We keep the canonical, provider-neutral access graph in this package. It has no database or HTTP
dependency by design.

We normalize providers into identities, resources, entitlements, and grants. Storage adapters
implement `AccessGraphRepository`; our policy, review, API, and connector modules consume only
that interface.
