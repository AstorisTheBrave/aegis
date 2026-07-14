# Access graph contracts

This package owns the canonical, provider-neutral access graph. It intentionally contains no
database or HTTP dependency.

Providers are normalized into identities, resources, entitlements, and grants. Storage adapters
implement `AccessGraphRepository`; policy, review, API, and connector modules consume only that
interface.
