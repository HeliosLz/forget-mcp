import { readFileSync, writeFileSync, renameSync } from "fs";
import type { ResolvedServer } from "./types.js";

/**
 * Disable an MCP server entry by removing it from the config file.
 * Uses atomic write: write to .tmp file, then rename (POSIX atomic).
 *
 * For ~/.claude.json entries (projectKey set), navigates to
 * projects[projectKey].mcpServers before deleting.
 */
export async function disableMcpEntry(server: ResolvedServer): Promise<void> {
  const configPath = server.configPath;
  const raw = readFileSync(configPath, "utf-8");
  const data = JSON.parse(raw);

  if (server.projectKey) {
    // ~/.claude.json nested structure
    const entry = data.projects?.[server.projectKey];
    if (!entry?.mcpServers || !(server.name in entry.mcpServers)) {
      return;
    }
    delete entry.mcpServers[server.name];
  } else {
    // Legacy flat structure (.mcp.json, settings.local.json, settings.json)
    if (!data.mcpServers || !(server.name in data.mcpServers)) {
      return;
    }
    delete data.mcpServers[server.name];
    // Keep mcpServers key even when empty to satisfy schema validation
  }

  const tmpPath = `${configPath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmpPath, configPath);
}
