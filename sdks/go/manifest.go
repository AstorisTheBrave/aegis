package aegis

import (
	"fmt"
	"regexp"
	"strings"
)

const ProtocolVersion = "1.0.0"

type Checkpoint struct { Cursor string; Watermark string }
type RetryDirective struct { RetryAfterMs int; Reason string }

func RetryForStatus(status int, retryAfterMs int) *RetryDirective {
	if status != 429 && status != 502 && status != 503 && status != 504 { return nil }
	if retryAfterMs < 250 { retryAfterMs = 250 }
	reason := "transient_failure"; if status == 429 { reason = "rate_limit" }
	return &RetryDirective{RetryAfterMs: retryAfterMs, Reason: reason}
}

type Manifest struct {
	ProtocolVersion string
	ID              string
	Capabilities    []string
	MinimumScopes   []string
}

var connectorID = regexp.MustCompile(`^[a-z][a-z0-9-]{2,62}$`)

func ValidateReadOnlyManifest(manifest Manifest) error {
	if manifest.ProtocolVersion != ProtocolVersion {
		return fmt.Errorf("unsupported connector protocol version")
	}
	if !connectorID.MatchString(manifest.ID) {
		return fmt.Errorf("invalid connector ID")
	}
	if len(manifest.Capabilities) == 0 || len(manifest.MinimumScopes) == 0 {
		return fmt.Errorf("read-only connector manifests require capabilities and scopes")
	}
	for _, capability := range manifest.Capabilities {
		if capability != "IDENTITY_READ" && capability != "ACCESS_GRAPH_READ" && capability != "USAGE_READ" {
			return fmt.Errorf("capability %s is not read-only", capability)
		}
	}
	return nil
}

func RedactHeaders(headers map[string]string) map[string]string {
	redacted := make(map[string]string, len(headers))
	for key, value := range headers {
		if strings.Contains(strings.ToLower(key), "authorization") || strings.Contains(strings.ToLower(key), "token") {
			redacted[key] = "REDACTED"
		} else {
			redacted[key] = value
		}
	}
	return redacted
}
