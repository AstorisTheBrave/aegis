#include "aegis_connector.hpp"
#include <cassert>
int main() {
  aegis::manifest manifest{aegis::protocol_version, "example-connector", {"IDENTITY_READ", "ACCESS_GRAPH_READ"}, {"users.read"}};
  assert(aegis::validate_read_only_manifest(manifest));
  return 0;
}
