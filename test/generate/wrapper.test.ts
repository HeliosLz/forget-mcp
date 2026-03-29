import { describe, it, expect } from "bun:test";
import { generateWrapper } from "../../src/generate/wrapper.js";
import type { CuratedMapping } from "../../src/config/types.js";

const mockMapping: CuratedMapping = {
  server_patterns: ["test-server"],
  classification: "tool-type",
  cli: {
    name: "testcli",
    install: { darwin: "brew install testcli" },
    version_check: "testcli --version",
  },
  env_vars: [],
  tools: {
    list_items: { subcommand: "list", args: [] },
    get_item: { subcommand: "get", args: ["id"] },
  },
  wrapper_template:
    'case "${1:-}" in\n  list)\n    testcli list | head -n "$MAX_LINES"\n    ;;\n  get)\n    testcli get "$2" | head -n "$MAX_LINES"\n    ;;',
};

describe("generateWrapper", () => {
  it("generates valid bash script", () => {
    const result = generateWrapper("test-server", mockMapping);
    expect(result).toStartWith("#!/usr/bin/env bash");
  });

  it("includes set -euo pipefail", () => {
    const result = generateWrapper("test-server", mockMapping);
    expect(result).toContain("set -euo pipefail");
  });

  it("includes MAX_LINES variable", () => {
    const result = generateWrapper("test-server", mockMapping);
    expect(result).toContain("FORGET_MCP_MAX_LINES:-200");
  });

  it("includes the wrapper_template content", () => {
    const result = generateWrapper("test-server", mockMapping);
    expect(result).toContain("testcli list");
    expect(result).toContain("testcli get");
  });

  it("includes help case", () => {
    const result = generateWrapper("test-server", mockMapping);
    expect(result).toContain("help|\"\"");
    expect(result).toContain("test-server.sh");
    expect(result).toContain("list, get <id>");
  });

  it("includes unknown command error", () => {
    const result = generateWrapper("test-server", mockMapping);
    expect(result).toContain("Unknown command");
    expect(result).toContain("exit 1");
  });

  it("includes source server comment", () => {
    const result = generateWrapper("test-server", mockMapping);
    expect(result).toContain("Replaces: test-server");
  });
});
