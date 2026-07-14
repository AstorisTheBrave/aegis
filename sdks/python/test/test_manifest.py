import unittest

from aegis_connector_sdk import redact_fixture, validate_read_only_manifest


class ManifestTest(unittest.TestCase):
    def test_read_only_manifest_and_redaction(self):
        validate_read_only_manifest({"protocolVersion": "1.0.0", "id": "example-connector", "capabilities": ["IDENTITY_READ"], "minimumScopes": ["users.read"]})
        self.assertEqual(redact_fixture({"authorization": "Bearer secret"})["authorization"], "REDACTED")


if __name__ == "__main__":
    unittest.main()
