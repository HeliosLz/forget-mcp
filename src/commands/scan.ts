import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { parseAllConfigs } from "../config/parser.js";
import { findMapping } from "../mappings/index.js";
import type { McpServerConfig } from "../config/types.js";
import * as out from "../utils/output.js";

/**
 * Derive the skill file name for a server using the mapping matcher.
 * Returns null if no curated mapping exists.
 */
function skillNameForServer(serverName: string, config: McpServerConfig): string | null {
  const mapping = findMapping(serverName, config);
  if (!mapping) return null;
  return mapping.server_patterns[0].toLowerCase();
}

function isSkillInstalled(skillName: string, global: boolean): boolean {
  const base = global ? join(homedir(), ".claude") : ".claude";
  return existsSync(join(base, "skills", "forget-mcp", `${skillName}.md`));
}

export async function scan(flags: Set<string>): Promise<void> {
  const global = flags.has("--global");
  const servers = await parseAllConfigs();

  if (servers.length === 0) {
    out.info("No MCP servers found in Claude Code config.");
    out.info("Checked: ~/.claude.json, .claude/settings.local.json, ~/.claude/settings.json, .mcp.json");
    return;
  }

  const rows = servers.map((s) => {
    const type = s.config.type || "stdio";
    const skill = skillNameForServer(s.name, s.config);
    let skillCol: string;
    if (skill && isSkillInstalled(skill, global)) {
      skillCol = "✓ installed";
    } else if (skill) {
      skillCol = `available (run: install ${skill})`;
    } else {
      skillCol = "—";
    }
    return [s.name, type, s.scope, skillCol];
  });

  out.info(`Found ${servers.length} MCP server(s):\n`);
  out.table(["Server", "Type", "Scope", "Skill"], rows);

  out.json(
    servers.map((s) => {
      const skill = skillNameForServer(s.name, s.config);
      return {
        name: s.name,
        type: s.config.type || "stdio",
        scope: s.scope,
        skillName: skill,
        skillInstalled: skill ? isSkillInstalled(skill, global) : false,
      };
    })
  );
}
