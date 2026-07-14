pub const PROTOCOL_VERSION: &str = "1.0.0";

pub struct Manifest<'a> {
    pub protocol_version: &'a str,
    pub id: &'a str,
    pub capabilities: &'a [&'a str],
    pub minimum_scopes: &'a [&'a str],
}

pub fn validate_read_only_manifest(manifest: &Manifest<'_>) -> Result<(), &'static str> {
    if manifest.protocol_version != PROTOCOL_VERSION {
        return Err("unsupported connector protocol version");
    }
    if manifest.id.len() < 3 || !manifest.id.chars().all(|character| character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-') {
        return Err("invalid connector ID");
    }
    if manifest.capabilities.is_empty() || manifest.minimum_scopes.is_empty() {
        return Err("read-only connector manifests require capabilities and scopes");
    }
    if manifest.capabilities.iter().any(|capability| !matches!(*capability, "IDENTITY_READ" | "ACCESS_GRAPH_READ" | "USAGE_READ")) {
        return Err("capability is not read-only");
    }
    Ok(())
}

pub fn redact_fixture(value: &str) -> String {
    if value.to_ascii_lowercase().contains("bearer ") { "REDACTED".to_owned() } else { value.to_owned() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_manifest_and_redacts_fixture() {
        let fixture = include_str!("../../fixtures/connector-v1-manifest.json");
        assert!(fixture.contains("\"protocolVersion\": \"1.0.0\""));
        assert!(fixture.contains("\"ACCESS_GRAPH_READ\""));
        let manifest = Manifest { protocol_version: PROTOCOL_VERSION, id: "example-connector", capabilities: &["IDENTITY_READ", "ACCESS_GRAPH_READ"], minimum_scopes: &["users.read"] };
        assert!(validate_read_only_manifest(&manifest).is_ok());
        assert_eq!(redact_fixture("Bearer secret"), "REDACTED");
    }
}
