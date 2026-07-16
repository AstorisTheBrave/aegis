#include "aegis_connector.h"
#include <string.h>

static int is_read_only(const char *capability) {
  return strcmp(capability, "IDENTITY_READ") == 0 ||
         strcmp(capability, "ACCESS_GRAPH_READ") == 0 ||
         strcmp(capability, "USAGE_READ") == 0;
}

int aegis_validate_read_only_manifest(const aegis_manifest *manifest) {
  size_t index;
  if (manifest == NULL || manifest->protocol_version == NULL || manifest->id == NULL ||
      strcmp(manifest->protocol_version, AEGIS_CONNECTOR_PROTOCOL_VERSION) != 0 ||
      manifest->capability_count == 0 || manifest->minimum_scope_count == 0 || strlen(manifest->id) < 3) return 1;
  for (index = 0; index < manifest->capability_count; ++index) {
    if (manifest->capabilities[index] == NULL || !is_read_only(manifest->capabilities[index])) return 1;
  }
  return 0;
}

void aegis_checkpoint_clear(aegis_checkpoint *checkpoint) {
  if (checkpoint != NULL) { checkpoint->cursor = NULL; checkpoint->watermark = NULL; }
}
