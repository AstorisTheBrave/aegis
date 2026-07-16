#pragma once

#include <string_view>
#include <vector>

namespace aegis {
inline constexpr std::string_view protocol_version = "1.0.0";
struct manifest { std::string_view protocol; std::string_view id; std::vector<std::string_view> capabilities; std::vector<std::string_view> minimum_scopes; };
struct checkpoint { std::string_view cursor{}; std::string_view watermark{}; };
inline bool validate_read_only_manifest(const manifest& value) {
  if (value.protocol != protocol_version || value.id.size() < 3 || value.capabilities.empty() || value.minimum_scopes.empty()) return false;
  for (const auto capability : value.capabilities) if (capability != "IDENTITY_READ" && capability != "ACCESS_GRAPH_READ" && capability != "USAGE_READ") return false;
  return true;
}
}  // namespace aegis
