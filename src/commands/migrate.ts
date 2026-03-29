import { parseAllConfigs } from "../config/parser.js";
import { findMapping } from "../mappings/index.js";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as out from "../utils/output.js";

export async function migrate(flags: Set<string>): Promise<void> {
  const servers = await parseAllConfigs();

  if (servers.length === 0) {
    out.info("No MCP servers found. Nothing to migrate.");
    return;
  }

  const unconverted = servers.filter((s) => {
    const local = existsSync(join(".claude", "skills", s.name, "SKILL.md"));
    const global = existsSync(join(homedir(), ".claude", "skills", s.name, "SKILL.md"));
    return !local && !global;
  });

  const convertable = unconverted.filter((s) => findMapping(s.name, s.config));
  const noMapping = unconverted.filter((s) => !findMapping(s.name, s.config));

  const converted = servers.length - unconverted.length;

  out.info("# Migration Guide\n");
  out.info(`Current state: ${converted}/${servers.length} servers converted.\n`);

  if (convertable.length > 0) {
    out.info(`## Step 1: Convert ${convertable.length} server(s) with curated mappings\n`);
    out.info("```bash");
    if (convertable.length === unconverted.length && noMapping.length === 0) {
      out.info("forget-mcp convert --all");
    } else {
      for (const s of convertable) {
        out.info(`forget-mcp convert ${s.name}`);
      }
    }
    out.info("```\n");

    out.info("## Step 2: Verify each conversion\n");
    out.info("```bash");
    out.info("# Quick check (CI-safe, no credentials needed):");
    for (const s of convertable) {
      out.info(`forget-mcp verify --dry ${s.name}`);
    }
    out.info("");
    out.info("# Full check (needs live credentials):");
    for (const s of convertable) {
      out.info(`forget-mcp verify ${s.name}`);
    }
    out.info("```\n");
  }

  if (noMapping.length > 0) {
    const step = convertable.length > 0 ? "3" : "1";
    out.info(`## Step ${step}: Servers without curated mappings\n`);
    out.info("These servers have no curated mapping. Options:");
    out.info("  a) Keep them as MCP (they may be service-type or uncommon)");
    out.info("  b) Request a mapping at https://github.com/HeliosLz/forget-mcp/issues\n");
    for (const s of noMapping) {
      const type = s.config.type || "stdio";
      out.info(`  - ${s.name} (${type}, ${s.scope} scope)`);
    }
    out.info("");
  }

  if (converted > 0 && unconverted.length === 0) {
    out.info("All servers converted! Run `forget-mcp status` to confirm.");
  }

  out.json({
    total: servers.length,
    converted,
    convertable: convertable.map((s) => s.name),
    noMapping: noMapping.map((s) => s.name),
  });
}
