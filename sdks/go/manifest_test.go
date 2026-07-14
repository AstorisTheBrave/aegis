package aegis

import "testing"

func TestReadOnlyManifestAndRedaction(t *testing.T) {
	if err := ValidateReadOnlyManifest(Manifest{ProtocolVersion: ProtocolVersion, ID: "example-connector", Capabilities: []string{"IDENTITY_READ"}, MinimumScopes: []string{"users.read"}}); err != nil {
		t.Fatal(err)
	}
	if got := RedactHeaders(map[string]string{"Authorization": "Bearer secret"})["Authorization"]; got != "REDACTED" {
		t.Fatalf("expected redaction, got %s", got)
	}
}
