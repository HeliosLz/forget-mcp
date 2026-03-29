import { parseAllConfigs } from "../config/parser.js";
import { disableMcpEntry } from "../config/writer.js";
import { findMapping } from "../mappings/index.js";
import { generateSkill } from "../generate/skill.js";
import { generateWrapper } from "../generate/wrapper.js";
import { connectAndListTools } from "../introspect/connector.js";
import type { ConvertResult, ResolvedServer } from "../config/types.js";
import * as out from "../utils/output.js";
import { mkdirSync, writeFileSync, existsSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import * as readline from "readline";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function skillDir(serverName: string, global: boolean): string {
  if (global) {
    return join(homedir(), ".claude", "skills", serverName);
  }
  return join(".claude", "skills", serverName);
}

async function convertOne(
  server: ResolvedServer,
  flags: Set<string>
): Promise<ConvertResult> {
  const global = flags.has("--global");
  const outDir = skillDir(server.name, global);

  if (existsSync(outDir) && !flags.has("--force")) {
    const answer = await prompt(`Skill "${server.name}" already exists. Overwrite? (y/n) `);
    if (answer !== "y" && answer !== "yes") {
      throw new Error(`Skipped ${server.name} (already exists)`);
    }
  }

  const mapping = findMapping(server.name, server.config);
  let introspectedTools: string[] | undefined;

  if (!mapping) {
    out.info(`No curated mapping for "${server.name}". Attempting MCP introspection...`);
    try {
      introspectedTools = await connectAndListTools(server.config);
      out.info(`Discovered ${introspectedTools.length} tools via introspection.`);
    } catch (err) {
      throw new Error(
        `No curated mapping and introspection failed for "${server.name}": ${err instanceof Error ? err.message : err}`
      );
    }
  }

  // Generate files to temp dir first (atomic)
  const tmpDir = `${outDir}.tmp`;
  mkdirSync(join(tmpDir, "tools"), { recursive: true });

  const skillContent = generateSkill(server.name, mapping, introspectedTools);
  const skillPath = join(tmpDir, "SKILL.md");
  writeFileSync(skillPath, skillContent);

  let wrapperPath = "";
  let toolsMapped = 0;
  let toolsStubbed = 0;

  if (mapping) {
    const wrapperContent = generateWrapper(server.name, mapping);
    wrapperPath = join(tmpDir, "tools", `${server.name}.sh`);
    writeFileSync(wrapperPath, wrapperContent);
    chmodSync(wrapperPath, 0o755);
    toolsMapped = Object.keys(mapping.tools).length;
  } else if (introspectedTools) {
    toolsStubbed = introspectedTools.length;
  }

  // Atomic move: remove old, rename tmp
  const { rmSync, renameSync } = await import("fs");
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true });
  }
  renameSync(tmpDir, outDir);

  const result: ConvertResult = {
    server: server.name,
    skillPath: join(outDir, "SKILL.md"),
    wrapperPath: mapping ? join(outDir, "tools", `${server.name}.sh`) : "",
    toolsMapped,
    toolsStubbed,
  };

  const summary = toolsStubbed > 0
    ? `${toolsMapped} tools mapped, ${toolsStubbed} stubs`
    : `${toolsMapped} tools mapped`;
  out.success(`Converted ${server.name}: ${summary}`);
  out.json(result);

  return result;
}

export async function convert(args: string[], flags: Set<string>): Promise<void> {
  const servers = await parseAllConfigs();
  const all = args.includes("--all") || flags.has("--all");

  let targets: ResolvedServer[];

  if (all) {
    targets = servers.filter((s) => findMapping(s.name, s.config));
    if (targets.length === 0) {
      out.info("No servers with curated mappings found.");
      return;
    }
    out.info(`Converting ${targets.length} server(s) with curated mappings...\n`);
  } else {
    const name = args[0];
    if (!name) {
      out.error("Usage: forget-mcp convert <server> or forget-mcp convert --all");
      process.exit(1);
    }
    const server = servers.find((s) => s.name === name);
    if (!server) {
      out.error(`Server "${name}" not found in config.`);
      out.info(`Run "forget-mcp scan" to see available servers.`);
      process.exit(1);
    }
    targets = [server];
  }

  for (const server of targets) {
    await convertOne(server, flags);

    // Prompt to disable MCP entry
    if (!flags.has("--keep")) {
      if (flags.has("--disable")) {
        await disableMcpEntry(server);
        out.success(`Disabled MCP entry for "${server.name}" in ${server.configPath}`);
      } else {
        const answer = await prompt(`Disable MCP server "${server.name}"? (y/n) `);
        if (answer === "y" || answer === "yes") {
          await disableMcpEntry(server);
          out.success(`Disabled MCP entry for "${server.name}" in ${server.configPath}`);
        }
      }
    }
  }
}
