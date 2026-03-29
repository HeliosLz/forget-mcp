import { findMapping } from "../mappings/index.js";
import type { McpServerConfig } from "../config/types.js";

export type Classification = "tool-type" | "service-type" | "uncertain";

/**
 * Simplified classifier for Phase 1.
 * 1. If we have a curated mapping, use its classification.
 * 2. Otherwise, check transport type and basic heuristics.
 */
export function classify(
  serverName: string,
  config: McpServerConfig
): Classification {
  // Check curated mapping first
  const mapping = findMapping(serverName, config);
  if (mapping) {
    return mapping.classification;
  }

  // HTTP/SSE servers are more likely service-type (streaming, real-time)
  if (config.type === "sse") {
    return "service-type";
  }

  // HTTP servers could be either
  if (config.type === "http" || config.url) {
    return "uncertain";
  }

  // stdio servers are more likely tool-type
  return "uncertain";
}
