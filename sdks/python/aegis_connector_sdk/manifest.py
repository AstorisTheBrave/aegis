import re

PROTOCOL_VERSION = "1.0.0"
_READ_ONLY = {"IDENTITY_READ", "ACCESS_GRAPH_READ", "USAGE_READ"}


def validate_read_only_manifest(manifest: dict) -> None:
    if manifest.get("protocolVersion") != PROTOCOL_VERSION:
        raise ValueError("unsupported connector protocol version")
    if not re.fullmatch(r"[a-z][a-z0-9-]{2,62}", manifest.get("id", "")):
        raise ValueError("invalid connector ID")
    capabilities = set(manifest.get("capabilities", []))
    if not capabilities or not capabilities <= _READ_ONLY or not manifest.get("minimumScopes"):
        raise ValueError("read-only connector manifests require read capabilities and scopes")


def redact_fixture(value):
    if isinstance(value, list):
        return [redact_fixture(item) for item in value]
    if isinstance(value, dict):
        return {
            key: "REDACTED" if re.search(r"token|secret|authorization|password", key, re.I) else redact_fixture(item)
            for key, item in value.items()
        }
    if isinstance(value, str):
        return re.sub(r"bearer\s+\S+", "REDACTED", value, flags=re.I)
    return value
