import json
from pathlib import Path
import unittest

from aegis_connector_sdk import redact_fixture, validate_read_only_manifest


class ManifestTest(unittest.TestCase):
    def test_read_only_manifest_and_redaction(self):
        fixture = Path(__file__).parents[2] / "fixtures" / "connector-v1-manifest.json"
        validate_read_only_manifest(json.loads(fixture.read_text(encoding="utf-8")))
        self.assertEqual(redact_fixture({"authorization": "Bearer secret"})["authorization"], "REDACTED")


if __name__ == "__main__":
    unittest.main()
