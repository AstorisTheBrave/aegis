#include "aegis_connector.h"
#include <assert.h>

int main(void) {
  const char *capabilities[] = {"IDENTITY_READ", "ACCESS_GRAPH_READ"};
  const char *scopes[] = {"users.read"};
  aegis_manifest manifest = {AEGIS_CONNECTOR_PROTOCOL_VERSION, "example-connector", capabilities, 2, scopes, 1};
  aegis_checkpoint checkpoint = {"cursor", "watermark"};
  assert(aegis_validate_read_only_manifest(&manifest) == 0);
  aegis_checkpoint_clear(&checkpoint);
  assert(checkpoint.cursor == 0 && checkpoint.watermark == 0);
  return 0;
}
