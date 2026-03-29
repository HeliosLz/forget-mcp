import { readFileSync, writeFileSync, renameSync } from "fs";
import type { ResolvedServer } from "./types.js";

/**
 * Disable an MCP server entry by removing it from the config file.
 * Uses atomic write: write to .tmp file, then rename (POSIX atomic).
 */
export async function disableMcpEntry(server: ResolvedServer): Promise<void> {
  const configPath = server.configPath;
  const raw = readFileSync(configPath, "utf-8");
  const data = JSON.parse(raw);

  if (!data.mcpServers || !(server.name in data.mcpServers)) {
    return; // Already removed or not present
  }

  delete data.mcpServers[server.name];

  // Clean up empty mcpServers object
  if (Object.keys(data.mcpServers).length === 0) {
    delete data.mcpServers;
  }

  const tmpPath = `${configPath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmpPath, configPath);
}
