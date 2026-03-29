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
