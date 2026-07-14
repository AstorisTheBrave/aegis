# Credential host

The credential host is the only module that handles provider credentials. It encrypts records with
AES-256-GCM, binds a short-lived lease to a tenant, connector, and approved scopes, and rejects
cross-connector or expired use. Connector processes receive only a capability lease through the
host transport, never the platform master key.
