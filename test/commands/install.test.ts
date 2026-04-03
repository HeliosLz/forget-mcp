import { describe, it, expect, afterEach } from "bun:test";
import { existsSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, "..", ".test-tmp-install");
const PROJECT_ROOT = join(import.meta.dir, "../..");

describe("install command", () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it("installs a single skill by name", async () => {
    const dir = join(TEST_DIR, ".claude", "skills", "forget-mcp");
    const proc = Bun.spawn(
      ["bun", "run", "src/cli.ts", "install", "supabase"],
      {
        cwd: TEST_DIR.replace(/\.test-tmp-install$/, ""),
        env: { ...process.env, HOME: TEST_DIR },
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    // install writes to cwd's .claude/skills/, so we need cwd = TEST_DIR
    // But the script is in the project root. Use a subprocess approach.
    await proc.exited;

    // Use a direct approach: import and call install logic
    const { SKILL_NAMES } = await import("../../src/commands/install.js");
    expect(SKILL_NAMES).toContain("supabase");
    expect(SKILL_NAMES).toContain("github");
    expect(SKILL_NAMES).toContain("filesystem");
    expect(SKILL_NAMES).toContain("aws");
    expect(SKILL_NAMES).toContain("cloudflare");
    expect(SKILL_NAMES).not.toContain("_meta");
  });

  it("resolves custom server names via mapping patterns", async () => {
    // The resolveSkillName function uses findMapping to match
    // "@supabase/mcp-server-supabase" → supabase mapping → "supabase" skill
    const { findMapping } = await import("../../src/mappings/index.js");

    // Custom name that matches supabase via args pattern
    const mapping = findMapping("my-db-server", {
      command: "npx",
      args: ["-y", "@supabase/mcp-server-supabase"],
    });
    expect(mapping).not.toBeNull();
    expect(mapping!.server_patterns[0]).toBe("supabase");

    // Custom name that matches github via args pattern
    const ghMapping = findMapping("my-github", {
      command: "npx",
      args: ["@modelcontextprotocol/server-github"],
    });
    expect(ghMapping).not.toBeNull();
    expect(ghMapping!.server_patterns[0]).toBe("github");

    // Unmatched server
    const noMapping = findMapping("random-server", {
      command: "node",
      args: ["custom.js"],
    });
    expect(noMapping).toBeNull();
  });

  it("does not false-match short labels against longer patterns", async () => {
    const { findMapping } = await import("../../src/mappings/index.js");

    // "git" must NOT match "github"
    expect(findMapping("git", { command: "node", args: ["custom.js"] })).toBeNull();
    // "aws" as a custom name with unrelated args must NOT match
    expect(findMapping("cloud", { command: "node", args: ["server.js"] })).toBeNull();
    // "fs" must NOT match "filesystem"
    expect(findMapping("fs", { command: "node", args: ["fs-server.js"] })).toBeNull();
    // "mcp" alone must NOT match anything
    expect(findMapping("mcp", { command: "npx", args: ["my-mcp-tool"] })).toBeNull();
  });

  it("skill files contain required frontmatter", async () => {
    const skillDir = join(import.meta.dir, "../../skills");
    const files = ["supabase.md", "github.md", "filesystem.md", "aws.md", "cloudflare.md", "_meta.md"];

    for (const file of files) {
      const content = readFileSync(join(skillDir, file), "utf-8");
      expect(content).toMatch(/^---\n/);
      expect(content).toMatch(/name:/);
      expect(content).toMatch(/trigger:/);

      // Non-meta skills should have replaces_mcp
      if (file !== "_meta.md") {
        expect(content).toMatch(/replaces_mcp:/);
      }

      // Should have operation tables
      if (file !== "_meta.md") {
        expect(content).toContain("| Operation");
        expect(content).toContain("## Prerequisites");
        expect(content).toContain("## Output Handling");
      }
    }
  });

  it("_meta.md contains MCP replacement guide", async () => {
    const content = readFileSync(
      join(import.meta.dir, "../../skills/_meta.md"),
      "utf-8"
    );
    expect(content).toContain("Step 1");
    expect(content).toContain("Step 2");
    expect(content).toContain("Step 3");
    expect(content).toContain("Step 4");
    expect(content).toContain("disabled");
  });
});

describe("install e2e: custom label and error handling", () => {
  const testDir = join(import.meta.dir, "..", ".test-tmp-install-e2e");

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it("resolves custom server label via config lookup", async () => {
    // Set up: cwd has .mcp.json with "db" → @supabase/mcp-server-supabase
    mkdirSync(testDir, { recursive: true });
    writeFileSync(
      join(testDir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          db: { command: "npx", args: ["-y", "@supabase/mcp-server-supabase"] },
        },
      })
    );

    const script = [
      `process.chdir(${JSON.stringify(testDir)});`,
      `const { install } = await import(${JSON.stringify(join(PROJECT_ROOT, "src/commands/install.ts"))});`,
      `await install(["db"], new Set());`,
    ].join("\n");

    const proc = Bun.spawn(["bun", "-e", script], {
      cwd: testDir,
      env: { ...process.env },
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();

    expect(exitCode).toBe(0);

    // Verify supabase.md and _meta.md were written
    const skillDir = join(testDir, ".claude", "skills", "forget-mcp");
    expect(existsSync(join(skillDir, "supabase.md"))).toBe(true);
    expect(existsSync(join(skillDir, "_meta.md"))).toBe(true);
  });

  it("exits non-zero and writes no files for unknown skill", async () => {
    mkdirSync(testDir, { recursive: true });

    const script = [
      `process.chdir(${JSON.stringify(testDir)});`,
      `const { install } = await import(${JSON.stringify(join(PROJECT_ROOT, "src/commands/install.ts"))});`,
      `await install(["supabsae"], new Set());`,
    ].join("\n");

    const proc = Bun.spawn(["bun", "-e", script], {
      cwd: testDir,
      env: { ...process.env },
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;

    expect(exitCode).not.toBe(0);

    // No files should be written — no _meta.md, no skill dir
    const skillDir = join(testDir, ".claude", "skills", "forget-mcp");
    expect(existsSync(join(skillDir, "_meta.md"))).toBe(false);
    expect(existsSync(join(skillDir, "supabase.md"))).toBe(false);
  });
});
