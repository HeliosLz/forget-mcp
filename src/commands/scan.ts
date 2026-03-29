import { parseAllConfigs } from "../config/parser.js";
import { findMapping } from "../mappings/index.js";
import * as out from "../utils/output.js";

export async function scan(flags: Set<string>): Promise<void> {
  const servers = await parseAllConfigs();

  if (servers.length === 0) {
    out.info("No MCP servers found in Claude Code config.");
    out.info("Checked: .claude/settings.local.json, ~/.claude/settings.json, .mcp.json");
    return;
  }

  const rows = servers.map((s) => {
    const mapping = findMapping(s.name, s.config);
    const type = s.config.type || "stdio";
    const mapped = mapping ? "✓ curated" : "—";
    return [s.name, type, s.scope, mapped];
  });

  out.info(`Found ${servers.length} MCP server(s):\n`);
  out.table(["Server", "Type", "Scope", "Mapping"], rows);

  out.json(
    servers.map((s) => ({
      name: s.name,
      type: s.config.type || "stdio",
      scope: s.scope,
      hasCuratedMapping: !!findMapping(s.name, s.config),
    }))
  );
}
