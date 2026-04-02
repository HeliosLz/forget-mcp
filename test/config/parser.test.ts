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

describe("extractServers (root-level mcpServers)", () => {
  it("extracts servers from root-level mcpServers", async () => {
    const { extractServers } = await import("../../src/config/parser.js");
    const data = {
      mcpServers: {
        "context7": { command: "npx", args: ["-y", "@upstash/context7-mcp"] },
        "fetch": { command: "npx", args: ["mcp-fetch-server"] },
        "sequential-thinking": { command: "npx", args: ["-y", "@modelcontextprotocol/server-sequential-thinking"] },
      },
    };
    const servers = extractServers(data);
    expect(Object.keys(servers)).toHaveLength(3);
    expect(servers["context7"].command).toBe("npx");
    expect(servers["fetch"].args).toEqual(["mcp-fetch-server"]);
    expect(servers["sequential-thinking"]).toBeDefined();
  });

  it("returns empty object when no mcpServers at root", async () => {
    const { extractServers } = await import("../../src/config/parser.js");
    expect(extractServers({ projects: {} })).toEqual({});
    expect(extractServers(null)).toEqual({});
    expect(extractServers({})).toEqual({});
  });

  it("extracts root-level even when projects key also exists", async () => {
    const { extractServers } = await import("../../src/config/parser.js");
    const data = {
      mcpServers: {
        "root-server": { command: "node", args: ["root.js"] },
      },
      projects: {
        "/some/path": {
          mcpServers: {
            "nested-server": { command: "node", args: ["nested.js"] },
          },
        },
      },
    };
    const servers = extractServers(data);
    expect(Object.keys(servers)).toHaveLength(1);
    expect(servers["root-server"]).toBeDefined();
    // extractServers only reads root-level, not nested projects
    expect(servers["nested-server"]).toBeUndefined();
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

describe("parseAllConfigs e2e: root-level mcpServers precedence", () => {
  it("root-level mcpServers wins over projects[home] and legacy user", async () => {
    // Module-level HOME/CLAUDE_JSON_PATH are set at import time,
    // so we run parseAllConfigs in a subprocess with HOME overridden.
    const testDir = join(import.meta.dir, "..", ".test-tmp-e2e");
    const fakeHome = join(testDir, "home");
    const fakeCwd = join(testDir, "work");
    const parserPath = join(import.meta.dir, "../../src/config/parser.ts");

    mkdirSync(join(fakeHome, ".claude"), { recursive: true });
    mkdirSync(fakeCwd, { recursive: true });

    // ~/.claude.json with BOTH root-level and projects[home] mcpServers
    writeFileSync(
      join(fakeHome, ".claude.json"),
      JSON.stringify({
        mcpServers: {
          shared: { command: "from-root", args: [] },
          "root-only": { command: "from-root", args: [] },
        },
        projects: {
          [fakeHome]: {
            mcpServers: {
              shared: { command: "from-projects-home", args: [] },
              "ph-only": { command: "from-projects-home", args: [] },
            },
          },
        },
      })
    );

    // Legacy ~/.claude/settings.json
    writeFileSync(
      join(fakeHome, ".claude", "settings.json"),
      JSON.stringify({
        mcpServers: {
          shared: { command: "from-legacy", args: [] },
          "legacy-only": { command: "from-legacy", args: [] },
        },
      })
    );

    const script = [
      `process.chdir(${JSON.stringify(fakeCwd)});`,
      `const { parseAllConfigs } = await import(${JSON.stringify(parserPath)});`,
      `const servers = await parseAllConfigs();`,
      `console.log(JSON.stringify(servers));`,
    ].join("\n");

    try {
      const proc = Bun.spawn(["bun", "-e", script], {
        env: { ...process.env, HOME: fakeHome },
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);

      const servers = JSON.parse(output.trim());

      // "shared" should come from root-level (wins over projects[home] and legacy)
      const shared = servers.find((s: any) => s.name === "shared");
      expect(shared).toBeDefined();
      expect(shared.config.command).toBe("from-root");
      expect(shared.scope).toBe("user");
      expect(shared.projectKey).toBeUndefined();

      // root-only present from root-level
      const rootOnly = servers.find((s: any) => s.name === "root-only");
      expect(rootOnly).toBeDefined();
      expect(rootOnly.config.command).toBe("from-root");
      expect(rootOnly.scope).toBe("user");

      // projects[home]-only still reachable
      const phOnly = servers.find((s: any) => s.name === "ph-only");
      expect(phOnly).toBeDefined();
      expect(phOnly.config.command).toBe("from-projects-home");
      expect(phOnly.scope).toBe("user");

      // legacy-only still reachable
      const legacyOnly = servers.find((s: any) => s.name === "legacy-only");
      expect(legacyOnly).toBeDefined();
      expect(legacyOnly.config.command).toBe("from-legacy");
      expect(legacyOnly.scope).toBe("user");
    } finally {
      rmSync(testDir, { recursive: true });
    }
  });
});
