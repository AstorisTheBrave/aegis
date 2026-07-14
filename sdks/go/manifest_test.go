package aegis

import (
	"encoding/json"
	"os"
	"testing"
)

func TestReadOnlyManifestAndRedaction(t *testing.T) {
	contents, err := os.ReadFile("../fixtures/connector-v1-manifest.json")
	if err != nil {
		t.Fatal(err)
	}
	var manifest Manifest
	if err := json.Unmarshal(contents, &manifest); err != nil {
		t.Fatal(err)
	}
	if err := ValidateReadOnlyManifest(manifest); err != nil {
		t.Fatal(err)
	}
	if got := RedactHeaders(map[string]string{"Authorization": "Bearer secret"})["Authorization"]; got != "REDACTED" {
		t.Fatalf("expected redaction, got %s", got)
	}
}
