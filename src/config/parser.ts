import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { McpServerConfig, ScopeConfig, ResolvedServer } from "./types.js";

function readJsonSafe(path: string): Record<string, any> | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function extractServers(data: Record<string, any> | null): Record<string, McpServerConfig> {
  if (!data || typeof data !== "object") return {};
  if (data.mcpServers && typeof data.mcpServers === "object") {
    return data.mcpServers as Record<string, McpServerConfig>;
  }
  return {};
}

export function parseScope(scope: "local" | "user" | "project"): ScopeConfig {
  let path: string;
  switch (scope) {
    case "local":
      path = join(".claude", "settings.local.json");
      break;
    case "user":
      path = join(homedir(), ".claude", "settings.json");
      break;
    case "project":
      path = ".mcp.json";
      break;
  }
  const data = readJsonSafe(path);
  return { scope, path, servers: extractServers(data) };
}

/**
 * Parse all 3 config scopes and merge.
 * Precedence: local > project > user (same as Claude Code).
 */
export async function parseAllConfigs(): Promise<ResolvedServer[]> {
  const scopes: ScopeConfig[] = [
    parseScope("local"),
    parseScope("project"),
    parseScope("user"),
  ];

  const seen = new Set<string>();
  const result: ResolvedServer[] = [];

  // Higher-precedence scopes first
  for (const scope of scopes) {
    for (const [name, config] of Object.entries(scope.servers)) {
      if (seen.has(name)) continue;
      seen.add(name);
      result.push({ name, config, scope: scope.scope, configPath: scope.path });
    }
  }

  return result;
}
