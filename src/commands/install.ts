import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { findMapping } from "../mappings/index.js";
import { parseAllConfigs } from "../config/parser.js";
import * as out from "../utils/output.js";

// Skill files are bundled as strings via bun build
import supabaseMd from "../skills/supabase.md" with { type: "text" };
import githubMd from "../skills/github.md" with { type: "text" };
import filesystemMd from "../skills/filesystem.md" with { type: "text" };
import awsMd from "../skills/aws.md" with { type: "text" };
import cloudflareMd from "../skills/cloudflare.md" with { type: "text" };
import metaMd from "../skills/_meta.md" with { type: "text" };

const SKILLS: Record<string, string> = {
  supabase: supabaseMd,
  github: githubMd,
  filesystem: filesystemMd,
  aws: awsMd,
  cloudflare: cloudflareMd,
  _meta: metaMd,
};

export const SKILL_NAMES = Object.keys(SKILLS).filter((k) => k !== "_meta");

/**
 * Resolve a user-provided name to a skill key.
 * 1. Direct skill name match (e.g. "supabase")
 * 2. Mapping pattern match (e.g. "@supabase/mcp-server-supabase")
 * 3. Config lookup: find server by label in config, then match via its full config
 */
async function resolveSkillName(input: string): Promise<string | null> {
  const key = input.toLowerCase();
  if (SKILLS[key]) return key;

  // Try mapping matcher with input as server name
  const mapping = findMapping(input, { command: input });
  if (mapping) {
    const skillName = mapping.server_patterns[0].toLowerCase();
    if (SKILLS[skillName]) return skillName;
  }

  // Fall back: look up input as a configured server label
  const servers = await parseAllConfigs();
  const server = servers.find((s) => s.name.toLowerCase() === key);
  if (server) {
    const serverMapping = findMapping(server.name, server.config);
    if (serverMapping) {
      const skillName = serverMapping.server_patterns[0].toLowerCase();
      if (SKILLS[skillName]) return skillName;
    }
  }

  return null;
}

function skillDir(global: boolean): string {
  const base = global ? join(homedir(), ".claude") : ".claude";
  return join(base, "skills", "forget-mcp");
}

function writeSkill(dir: string, name: string, content: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.md`), content);
}

export async function install(args: string[], flags: Set<string>): Promise<void> {
  const global = flags.has("--global");
  const dir = skillDir(global);
  const installAll = flags.has("--all");

  if (!installAll && args.length === 0) {
    out.error("Usage: forget-mcp install <server> or forget-mcp install --all");
    out.info(`Available skills: ${SKILL_NAMES.join(", ")}`);
    process.exit(1);
  }

  const toInstall = installAll ? SKILL_NAMES : args;
  const installed: string[] = [];

  for (const name of toInstall) {
    const skill = await resolveSkillName(name);
    if (!skill) {
      out.warn(`No skill available for "${name}". Available: ${SKILL_NAMES.join(", ")}`);
      continue;
    }
    writeSkill(dir, skill, SKILLS[skill]);
    out.success(`${skill}.md → ${dir}/`);
    installed.push(skill);
  }

  if (installed.length > 0) {
    // Write _meta.md only when at least one skill was installed
    writeSkill(dir, "_meta", SKILLS._meta);
    out.info(`\nInstalled ${installed.length} skill(s) + _meta.md to ${dir}/`);
    out.info("Claude will now use CLI commands directly instead of MCP servers.");
  } else {
    out.error("No skills were installed.");
    process.exit(1);
  }

  out.json({ installed, directory: dir });
}
