# Changelog

All notable Aegis changes are recorded here. I follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-07-17

### Added

- Self-hosted access governance for read-only inventory, findings, reviews,
  evidence, discovery, access requests, and workflow previews.
- A language-neutral connector protocol with TypeScript, Python, Go, Rust, C,
  and C++ SDKs.
- Signed extension artifacts, fixture certification, provider profiles, and
  compatibility governance.
- Published multi-architecture API and Console images with build provenance.

### Security

- Same-origin console gateway, loopback API defaults, encrypted credential host,
  append-only audit evidence, and OWASP-aligned deployment tests.
- Release-only container publishing: images are built from validated `vX.Y.Z`
  tags, never ordinary branches or pull requests.
