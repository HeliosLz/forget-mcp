import type { CuratedMapping, McpServerConfig } from "../config/types.js";

// Static imports so bun build bundles the JSON files into the single output
import supabase from "./supabase.json";
import github from "./github.json";
import filesystem from "./filesystem.json";
import aws from "./aws.json";
import cloudflare from "./cloudflare.json";

const ALL_MAPPINGS: CuratedMapping[] = [
  supabase as CuratedMapping,
  github as CuratedMapping,
  filesystem as CuratedMapping,
  aws as CuratedMapping,
  cloudflare as CuratedMapping,
];

/**
 * Find a curated mapping for a server by matching name or command against server_patterns.
 */
export function findMapping(
  serverName: string,
  config: McpServerConfig
): CuratedMapping | null {
  // Build a set of strings to match against patterns
  const candidates = [serverName.toLowerCase()];
  if (config.command) candidates.push(config.command.toLowerCase());
  if (config.args) {
    for (const arg of config.args) {
      candidates.push(arg.toLowerCase());
    }
  }
  if (config.url) candidates.push(config.url.toLowerCase());

  for (const mapping of ALL_MAPPINGS) {
    for (const pattern of mapping.server_patterns) {
      const p = pattern.toLowerCase();
      for (const candidate of candidates) {
        if (candidate.includes(p) || p.includes(candidate)) {
          return mapping;
        }
      }
    }
  }

  return null;
}

/**
 * Load a specific mapping by server name (for verify command).
 */
export function loadMapping(serverName: string): CuratedMapping | null {
  const name = serverName.toLowerCase();
  return (
    ALL_MAPPINGS.find((m) =>
      m.server_patterns.some((p) => {
        const pl = p.toLowerCase();
        return pl.includes(name) || name.includes(pl);
      })
    ) || null
  );
}

export function getAllMappings(): CuratedMapping[] {
  return ALL_MAPPINGS;
}
