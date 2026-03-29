import { describe, it, expect } from "bun:test";
import { generateSkill } from "../../src/generate/skill.js";
import type { CuratedMapping } from "../../src/config/types.js";

const mockMapping: CuratedMapping = {
  server_patterns: ["test-server"],
  classification: "tool-type",
  cli: {
    name: "testcli",
    install: { darwin: "brew install testcli" },
    version_check: "testcli --version",
  },
  env_vars: [
    { name: "TEST_URL", required: true, description: "Test connection URL" },
  ],
  tools: {
    list_items: {
      subcommand: "list",
      args: [],
      output_format: "json",
    },
    get_item: {
      subcommand: "get",
      args: ["id"],
      output_format: "json",
      guidance: "Pass the item ID as the argument",
    },
  },
  wrapper_template: 'case "${1:-}" in\n  list) testcli list ;;\n  get) testcli get "$2" ;;',
};

describe("generateSkill", () => {
  it("generates SKILL.md with correct frontmatter", () => {
    const result = generateSkill("test-server", mockMapping);
    expect(result).toContain("name: test-server");
    expect(result).toContain("type: mcp-replacement");
    expect(result).toContain("generated_by: forget-mcp");
  });

  it("includes prerequisites section", () => {
    const result = generateSkill("test-server", mockMapping);
    expect(result).toContain("## Prerequisites");
    expect(result).toContain("**testcli**");
    expect(result).toContain("brew install testcli");
    expect(result).toContain("TEST_URL");
    expect(result).toContain("(required)");
  });

  it("includes operation mapping table", () => {
    const result = generateSkill("test-server", mockMapping);
    expect(result).toContain("## Operation Mapping");
    expect(result).toContain("list_items");
    expect(result).toContain("test-server.sh list");
    expect(result).toContain("get_item");
    expect(result).toContain("test-server.sh get <id>");
  });

  it("includes error patterns", () => {
    const result = generateSkill("test-server", mockMapping);
    expect(result).toContain("## Error Patterns");
    expect(result).toContain("command not found: testcli");
  });

  it("generates stub from introspected tools", () => {
    const result = generateSkill("unknown-server", null, ["tool_a", "tool_b"]);
    expect(result).toContain("status: incomplete");
    expect(result).toContain("tool_a");
    expect(result).toContain("tool_b");
    expect(result).toContain("needs manual mapping");
  });

  it("throws without mapping or introspection", () => {
    expect(() => generateSkill("bad", null)).toThrow();
  });
});
