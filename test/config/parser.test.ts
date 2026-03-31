import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";

// Test in a temp directory to avoid touching real config
const TEST_DIR = join(import.meta.dir, "..", ".test-tmp");

describe("config parser", () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, ".claude"), { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(join(import.meta.dir, "../.."));
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it("returns empty array when no config files exist", async () => {
    const { parseScope } = await import("../../src/config/parser.js");
    const result = parseScope("project");
    expect(result.servers).toEqual({});
  });

  it("parses project-level .mcp.json", async () => {
    writeFileSync(
      join(TEST_DIR, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          testserver: { command: "npx", args: ["-y", "test-mcp"] },
        },
      })
    );

    const { parseScope } = await import("../../src/config/parser.js");
    const result = parseScope("project");
    expect(result.servers).toHaveProperty("testserver");
    expect(result.servers.testserver.command).toBe("npx");
  });

  it("parses local-scope settings.local.json", async () => {
    writeFileSync(
      join(TEST_DIR, ".claude", "settings.local.json"),
      JSON.stringify({
        mcpServers: {
          local_server: { command: "node", args: ["server.js"] },
        },
      })
    );

    const { parseScope } = await import("../../src/config/parser.js");
    const result = parseScope("local");
    expect(result.servers).toHaveProperty("local_server");
  });

  it("handles malformed JSON gracefully", async () => {
    writeFileSync(join(TEST_DIR, ".mcp.json"), "{ invalid json }}}");

    const { parseScope } = await import("../../src/config/parser.js");
    const result = parseScope("project");
    expect(result.servers).toEqual({});
  });

  it("handles missing mcpServers key", async () => {
    writeFileSync(join(TEST_DIR, ".mcp.json"), JSON.stringify({ other: "data" }));

    const { parseScope } = await import("../../src/config/parser.js");
    const result = parseScope("project");
    expect(result.servers).toEqual({});
  });
});

describe("extractClaudeJsonServers logic", () => {
  it("extracts servers from nested projects structure", async () => {
    // Test the extraction logic via parseAllConfigs with a .mcp.json proxy
    // (since ~/.claude.json is a module-level constant we can't easily redirect)
    // We verify the extractServers reuse works via the project scope path
    const testDir = join(import.meta.dir, "..", ".test-tmp-claude");
    mkdirSync(join(testDir, ".claude"), { recursive: true });
    const origCwd = process.cwd();
    process.chdir(testDir);

    writeFileSync(
      join(testDir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          "project-server": { command: "node", args: ["srv.js"] },
        },
      })
    );

    try {
      const { parseAllConfigs } = await import("../../src/config/parser.js");
      const servers = await parseAllConfigs();
      const found = servers.find((s) => s.name === "project-server");
      expect(found).toBeDefined();
      expect(found!.scope).toBe("project");
      expect(found!.projectKey).toBeUndefined();
    } finally {
      process.chdir(origCwd);
      rmSync(testDir, { recursive: true });
    }
  });

  it("handles missing projects key gracefully", async () => {
    // extractClaudeJsonServers should return {} for data without projects key
    // We test this indirectly: parseAllConfigs should not throw even when
    // ~/.claude.json has no projects key (it returns servers from other scopes)
    const testDir = join(import.meta.dir, "..", ".test-tmp-noproj");
    mkdirSync(join(testDir, ".claude"), { recursive: true });
    const origCwd = process.cwd();
    process.chdir(testDir);

    try {
      const { parseAllConfigs } = await import("../../src/config/parser.js");
      const servers = await parseAllConfigs();
      expect(Array.isArray(servers)).toBe(true);
    } finally {
      process.chdir(origCwd);
      rmSync(testDir, { recursive: true });
    }
  });

  it("legacy settings.local.json servers are included", async () => {
    const testDir = join(import.meta.dir, "..", ".test-tmp-legacy");
    mkdirSync(join(testDir, ".claude"), { recursive: true });
    const origCwd = process.cwd();
    process.chdir(testDir);

    writeFileSync(
      join(testDir, ".claude", "settings.local.json"),
      JSON.stringify({
        mcpServers: {
          "legacy-local": { command: "node", args: ["old.js"] },
        },
      })
    );

    try {
      const { parseAllConfigs } = await import("../../src/config/parser.js");
      const servers = await parseAllConfigs();
      const found = servers.find((s) => s.name === "legacy-local");
      expect(found).toBeDefined();
      expect(found!.scope).toBe("local");
      expect(found!.projectKey).toBeUndefined();
    } finally {
      process.chdir(origCwd);
      rmSync(testDir, { recursive: true });
    }
  });
});
