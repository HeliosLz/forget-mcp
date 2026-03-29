#!/usr/bin/env node
import { scan } from "./commands/scan.js";
import { convert } from "./commands/convert.js";
import { verify } from "./commands/verify.js";
import { status } from "./commands/status.js";
import { migrate } from "./commands/migrate.js";
import * as out from "./utils/output.js";

const USAGE = `forget-mcp v0.1.0 — Kill MCP context overhead

Usage:
  forget-mcp scan              List MCP servers from Claude Code config
  forget-mcp convert <server>  Convert an MCP server to Skill + CLI wrapper
  forget-mcp convert --all     Convert all servers with curated mappings
  forget-mcp verify <server>   Smoke-test a converted server
  forget-mcp verify --dry <s>  Check tools/env without executing (CI-safe)
  forget-mcp status            Show converted vs unconverted servers
  forget-mcp migrate           Print step-by-step migration guide

Options:
  --json       Output as JSON (for scripting)
  --global     Write skills to ~/.claude/skills/ instead of .claude/skills/
  --disable    Auto-disable MCP entry after convert (no prompt)
  --keep       Don't prompt to disable MCP entry after convert
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
      case "convert":
        await convert(args.slice(1), flags);
        break;
      case "verify":
        await verify(args.slice(1), flags);
        break;
      case "status":
        await status(flags);
        break;
      case "migrate":
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
