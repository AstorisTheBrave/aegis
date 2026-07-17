# Credential host

The credential host is the only Aegis module that handles provider credentials. We encrypt records
with AES-256-GCM, bind a short-lived lease to a tenant, connector, and approved scopes, and reject
cross-connector or expired use. Connector processes receive only a capability lease through the
host transport, never the platform master key.
