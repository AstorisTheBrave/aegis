# Aegis connector SDKs

We publish Apache-2.0, protocol-only SDKs for TypeScript, Python, Go, Rust, C,
and C++. They provide read-only v1 manifest validation, checkpoints, retry
directives, and fixture redaction. We deliberately keep control-plane,
credential-host, and provider-mutation code out of them. Build generated C++
Protobuf/gRPC clients against a pinned compatible runtime; the C SDK exposes
only its own stable ABI.

Each SDK runs a native standard-library test suite through `pnpm test:sdks`.
