import { parseAllConfigs } from "../config/parser.js";
import { findMapping } from "../mappings/index.js";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as out from "../utils/output.js";

export async function status(flags: Set<string>): Promise<void> {
  const servers = await parseAllConfigs();

  if (servers.length === 0) {
    out.info("No MCP servers found.");
    return;
  }

  const rows = servers.map((s) => {
    const hasMapping = !!findMapping(s.name, s.config);
    const localSkill = existsSync(join(".claude", "skills", s.name, "SKILL.md"));
    const globalSkill = existsSync(join(homedir(), ".claude", "skills", s.name, "SKILL.md"));
    const converted = localSkill || globalSkill;
    const location = localSkill ? "project" : globalSkill ? "global" : "—";

    let state: string;
    if (converted) {
      state = "converted";
    } else if (hasMapping) {
      state = "ready (has mapping)";
    } else {
      state = "no mapping";
    }

    return [s.name, state, location, s.scope];
  });

  out.info("Server status:\n");
  out.table(["Server", "State", "Skill Location", "Config Scope"], rows);

  const converted = rows.filter((r) => r[1] === "converted").length;
  const ready = rows.filter((r) => r[1].startsWith("ready")).length;
  out.info(`\n${converted} converted, ${ready} ready to convert, ${rows.length} total`);

  out.json(
    servers.map((s) => {
      const localSkill = existsSync(join(".claude", "skills", s.name, "SKILL.md"));
      const globalSkill = existsSync(join(homedir(), ".claude", "skills", s.name, "SKILL.md"));
      return {
        name: s.name,
        converted: localSkill || globalSkill,
        hasMapping: !!findMapping(s.name, s.config),
        scope: s.scope,
      };
    })
  );
}
