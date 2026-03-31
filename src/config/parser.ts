import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { McpServerConfig, ScopeConfig, ResolvedServer } from "./types.js";

const HOME = homedir();
const CLAUDE_JSON_PATH = join(HOME, ".claude.json");

function readJsonSafe(path: string): Record<string, any> | null {
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

/**
 * Extract MCP servers from ~/.claude.json for a given project key.
 * Structure: { projects: { [path]: { mcpServers: { ... } } } }
 */
function extractClaudeJsonServers(
  data: Record<string, any> | null,
  projectKey: string
): Record<string, McpServerConfig> {
  if (!data || typeof data !== "object") return {};
  const projects = data.projects;
  if (!projects || typeof projects !== "object") return {};
  return extractServers(projects[projectKey]);
}

export function parseScope(scope: "local" | "user" | "project"): ScopeConfig {
  let path: string;
  switch (scope) {
    case "local":
      path = join(".claude", "settings.local.json");
      break;
    case "user":
      path = join(HOME, ".claude", "settings.json");
      break;
    case "project":
      path = ".mcp.json";
      break;
  }
  const data = readJsonSafe(path);
  return { scope, path, servers: extractServers(data) };
}

/**
 * Parse all config scopes and merge.
 * Precedence: local > project > user (same as Claude Code).
 *
 * For local and user scopes, servers can live in two places:
 *   - ~/.claude.json  → projects[cwd].mcpServers  (local)
 *   - ~/.claude.json  → projects[home].mcpServers  (user)
 *   - .claude/settings.local.json → mcpServers     (local, legacy)
 *   - ~/.claude/settings.json     → mcpServers     (user, legacy)
 *
 * ~/.claude.json entries take precedence within the same scope.
 */
export async function parseAllConfigs(): Promise<ResolvedServer[]> {
  const claudeJsonData = readJsonSafe(CLAUDE_JSON_PATH);
  const cwd = process.cwd();
  const home = HOME;

  // ~/.claude.json local-scope servers (canonical)
  const claudeJsonLocal = extractClaudeJsonServers(claudeJsonData, cwd);
  // ~/.claude.json user-scope servers (canonical)
  const claudeJsonUser = extractClaudeJsonServers(claudeJsonData, home);

  // Legacy settings files
  const legacyLocal = parseScope("local");
  const projectScope = parseScope("project");
  const legacyUser = parseScope("user");

  const seen = new Set<string>();
  const result: ResolvedServer[] = [];

  function addServers(
    servers: Record<string, McpServerConfig>,
    scope: "local" | "user" | "project",
    configPath: string,
    projectKey?: string
  ) {
    for (const [name, config] of Object.entries(servers)) {
      if (seen.has(name)) continue;
      seen.add(name);
      result.push({ name, config, scope, configPath, projectKey });
    }
  }

  // Precedence order: local > project > user
  // Within local/user, ~/.claude.json takes precedence over legacy settings files
  addServers(claudeJsonLocal, "local", CLAUDE_JSON_PATH, cwd);
  addServers(legacyLocal.servers, "local", legacyLocal.path);
  addServers(projectScope.servers, "project", projectScope.path);
  addServers(claudeJsonUser, "user", CLAUDE_JSON_PATH, home);
  addServers(legacyUser.servers, "user", legacyUser.path);

  return result;
}
