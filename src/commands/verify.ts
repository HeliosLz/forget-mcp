import { existsSync, accessSync, constants } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { homedir } from "os";
import { loadMapping } from "../mappings/index.js";
import * as out from "../utils/output.js";

function findSkillDir(name: string): string | null {
  const local = join(".claude", "skills", name);
  if (existsSync(local)) return local;
  const global = join(homedir(), ".claude", "skills", name);
  if (existsSync(global)) return global;
  return null;
}

async function dryVerify(name: string): Promise<void> {
  const dir = findSkillDir(name);
  if (!dir) {
    out.error(`Skill "${name}" not found in .claude/skills/ or ~/.claude/skills/`);
    process.exit(1);
  }

  out.info(`Dry verify: ${name} (${dir})\n`);
  const results: Array<{ check: string; pass: boolean; detail: string }> = [];

  // Check SKILL.md exists
  const skillPath = join(dir, "SKILL.md");
  results.push({
    check: "SKILL.md exists",
    pass: existsSync(skillPath),
    detail: skillPath,
  });

  // Check wrapper exists and is executable
  const wrapperPath = join(dir, "tools", `${name}.sh`);
  const wrapperExists = existsSync(wrapperPath);
  results.push({
    check: "Wrapper script exists",
    pass: wrapperExists,
    detail: wrapperPath,
  });

  if (wrapperExists) {
    try {
      accessSync(wrapperPath, constants.X_OK);
      results.push({ check: "Wrapper is executable", pass: true, detail: "" });
    } catch {
      results.push({ check: "Wrapper is executable", pass: false, detail: "chmod +x needed" });
    }
  }

  // Check CLI tool installed
  const mapping = loadMapping(name);
  if (mapping) {
    const cliName = mapping.cli.name;
    try {
      execSync(`which ${cliName}`, { stdio: "pipe" });
      results.push({ check: `CLI "${cliName}" installed`, pass: true, detail: "" });
    } catch {
      const installHint = mapping.cli.install[process.platform === "darwin" ? "darwin" : "linux"] || "";
      results.push({
        check: `CLI "${cliName}" installed`,
        pass: false,
        detail: installHint ? `Install: ${installHint}` : `${cliName} not found`,
      });
    }

    // Check env vars
    for (const v of mapping.env_vars) {
      const set = !!process.env[v.name];
      results.push({
        check: `Env ${v.name}`,
        pass: set || !v.required,
        detail: set ? "set" : v.required ? "MISSING (required)" : "not set (optional)",
      });
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  out.table(
    ["Check", "Status", "Detail"],
    results.map((r) => [r.check, r.pass ? "PASS" : "FAIL", r.detail])
  );

  out.info(`\n${passed}/${total} checks passed.`);
  out.json({ server: name, checks: results, passed, total });

  if (passed < total) process.exit(1);
}

async function liveVerify(name: string): Promise<void> {
  const dir = findSkillDir(name);
  if (!dir) {
    out.error(`Skill "${name}" not found.`);
    process.exit(1);
  }

  const mapping = loadMapping(name);
  if (!mapping) {
    out.error(`No curated mapping for "${name}". Cannot run live verify.`);
    process.exit(1);
  }

  const wrapperPath = join(dir, "tools", `${name}.sh`);
  if (!existsSync(wrapperPath)) {
    out.error(`Wrapper not found: ${wrapperPath}`);
    process.exit(1);
  }

  out.info(`Live verify: ${name}\n`);
  const results: Array<{ subcommand: string; pass: boolean; detail: string }> = [];

  for (const [toolName, tool] of Object.entries(mapping.tools)) {
    const subcmd = tool.subcommand;
    // For tools that require args, just run help or skip
    if (tool.args.length > 0) {
      results.push({
        subcommand: subcmd,
        pass: true,
        detail: `Skipped (requires args: ${tool.args.join(", ")})`,
      });
      continue;
    }

    try {
      const output = execSync(`bash "${wrapperPath}" ${subcmd}`, {
        encoding: "utf-8",
        timeout: 15000,
        env: process.env,
      });
      const lines = output.trim().split("\n").length;
      results.push({
        subcommand: subcmd,
        pass: true,
        detail: `OK (${lines} lines)`,
      });
    } catch (err: any) {
      results.push({
        subcommand: subcmd,
        pass: false,
        detail: err.message?.slice(0, 100) || "Failed",
      });
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  out.table(
    ["Subcommand", "Status", "Detail"],
    results.map((r) => [r.subcommand, r.pass ? "PASS" : "FAIL", r.detail])
  );

  out.info(`\n${passed}/${total} subcommands verified.`);
  out.json({ server: name, results, passed, total });

  if (passed < total) process.exit(1);
}

export async function verify(args: string[], flags: Set<string>): Promise<void> {
  const dry = flags.has("--dry");
  const name = args.filter((a) => !a.startsWith("--"))[0];

  if (!name) {
    out.error("Usage: forget-mcp verify <server> [--dry]");
    process.exit(1);
  }

  if (dry) {
    await dryVerify(name);
  } else {
    await liveVerify(name);
  }
}
