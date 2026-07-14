# Aegis connector SDKs

These Apache-2.0 protocol-only SDK seeds help connector authors validate the
read-only v1 manifest and redact recorded fixtures. They deliberately contain
no control-plane, credential-host, or provider-mutation code.

Each SDK runs a native standard-library test suite through `pnpm test:sdks`.
