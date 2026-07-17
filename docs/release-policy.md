# Release policy

I publish stable releases as `vMAJOR.MINOR.PATCH` Git tags. The tag is a Git
name; the version inside packages and images is `MAJOR.MINOR.PATCH`.

Before publishing, the release workflow checks that the tag exactly matches the
root, workspace, Python, and Rust versions and that the changelog includes the
release. It then runs formatting, linting, type checking, unit tests, SDK tests,
builds, and Docker end-to-end security tests.

Only that tag workflow can publish `ghcr.io/astoristhebrave/aegis-api` and
`ghcr.io/astoristhebrave/aegis-console`. Every published image carries OCI
version and revision labels, supports `linux/amd64` and `linux/arm64`, and has a
GitHub build-provenance attestation. The release workflow also creates the
matching GitHub Release.

Use the exact release tag in production Compose files. `latest` is a convenience
pointer produced by the same stable release workflow; it is not a deployment
contract.
