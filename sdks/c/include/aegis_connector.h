#ifndef AEGIS_CONNECTOR_H
#define AEGIS_CONNECTOR_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define AEGIS_CONNECTOR_PROTOCOL_VERSION "1.0.0"

typedef struct aegis_manifest {
  const char *protocol_version;
  const char *id;
  const char *const *capabilities;
  size_t capability_count;
  const char *const *minimum_scopes;
  size_t minimum_scope_count;
} aegis_manifest;

typedef struct aegis_checkpoint {
  const char *cursor;
  const char *watermark;
} aegis_checkpoint;

/* Returns zero for a valid v1 read-only manifest; never allocates memory. */
int aegis_validate_read_only_manifest(const aegis_manifest *manifest);
void aegis_checkpoint_clear(aegis_checkpoint *checkpoint);

#ifdef __cplusplus
}
#endif

#endif
