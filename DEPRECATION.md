# Deprecation policy

An artifact deprecation is an immutable signed lifecycle declaration. It must
state a human-readable reason, effective timestamp, and replacement identifier
when one exists. Deprecated artifacts remain visible in the catalog so operators
can plan migration. Retired artifacts cannot be newly installed.

Protocol changes use a new version. Aegis does not silently reinterpret an
existing protocol manifest or expand its permissions.
