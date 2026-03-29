import { describe, it, expect } from "bun:test";
import { classify } from "../../src/introspect/classifier.js";

describe("classify", () => {
  it("returns tool-type for servers with curated mappings", () => {
    const result = classify("supabase", {
      command: "npx",
      args: ["-y", "@supabase/mcp-server-supabase"],
    });
    expect(result).toBe("tool-type");
  });

  it("returns service-type for SSE transport", () => {
    const result = classify("unknown-sse", { type: "sse", url: "http://example.com" });
    expect(result).toBe("service-type");
  });

  it("returns uncertain for HTTP servers without mapping", () => {
    const result = classify("unknown-http", { type: "http", url: "http://example.com" });
    expect(result).toBe("uncertain");
  });

  it("returns uncertain for stdio servers without mapping", () => {
    const result = classify("unknown-stdio", { command: "npx", args: ["-y", "unknown-mcp"] });
    expect(result).toBe("uncertain");
  });
});
