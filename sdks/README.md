# Aegis connector SDKs

These Apache-2.0 protocol-only SDKs support TypeScript, Python, Go, Rust, C,
and C++. They provide read-only v1 manifest validation, checkpoints, retry
directives, and fixture redaction. They deliberately contain no control-plane,
credential-host, or provider-mutation code. Generated C++ Protobuf/gRPC clients
must be built against a pinned compatible runtime; the C SDK exposes only its
own stable ABI.

Each SDK runs a native standard-library test suite through `pnpm test:sdks`.
