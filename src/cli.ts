#!/usr/bin/env node
import { scan } from "./commands/scan.js";
import { install } from "./commands/install.js";
import { convert } from "./commands/convert.js";
import { verify } from "./commands/verify.js";
import { status } from "./commands/status.js";
import { migrate } from "./commands/migrate.js";
import * as out from "./utils/output.js";

const USAGE = `forget-mcp v0.3.0 — Kill MCP context overhead

Usage:
  forget-mcp scan              List MCP servers and available skills
  forget-mcp install <server>  Install a skill (replaces MCP with direct CLI)
  forget-mcp install --all     Install all available skills

  forget-mcp convert <server>  [deprecated] Generate wrapper + skill
  forget-mcp convert --all     [deprecated] Convert all servers
  forget-mcp verify <server>   [deprecated] Smoke-test a converted server
  forget-mcp status            [deprecated] Show converted vs unconverted
  forget-mcp migrate           [deprecated] Print migration guide

Options:
  --json       Output as JSON (for scripting)
  --global     Write skills to ~/.claude/skills/ instead of .claude/skills/
  --help       Show this help
`;

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
  const command = args[0];

  if (!command || flags.has("--help")) {
    console.log(USAGE);
    process.exit(0);
  }

  try {
    switch (command) {
      case "scan":
        await scan(flags);
        break;
      case "install":
        await install(args.slice(1), flags);
        break;
      case "convert":
        out.warn("'convert' is deprecated. Use 'install' instead — skills now guide Claude directly without wrappers.");
        await convert(args.slice(1), flags);
        break;
      case "verify":
        out.warn("'verify' is deprecated. Skill-based setup needs no verification — Claude checks prerequisites directly.");
        await verify(args.slice(1), flags);
        break;
      case "status":
        out.warn("'status' is deprecated. Use 'scan' to see skill availability.");
        await status(flags);
        break;
      case "migrate":
        out.warn("'migrate' is deprecated. Install skills with 'install --all' — the _meta skill guides Claude through replacement.");
        await migrate(flags);
        break;
      default:
        out.error(`Unknown command: ${command}`);
        console.log(USAGE);
        process.exit(1);
    }
  } catch (err) {
    out.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
