import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const MAPPINGS_DIR = join(import.meta.dir, "../../src/mappings");

const schemaRaw = readFileSync(join(MAPPINGS_DIR, "schema.json"), "utf-8");
const schema = JSON.parse(schemaRaw);

const mappingFiles = readdirSync(MAPPINGS_DIR).filter(
  (f) => f.endsWith(".json") && f !== "schema.json"
);

describe("curated mappings", () => {
  it("has at least 5 mapping files", () => {
    expect(mappingFiles.length).toBeGreaterThanOrEqual(5);
  });

  for (const file of mappingFiles) {
    describe(file, () => {
      const raw = readFileSync(join(MAPPINGS_DIR, file), "utf-8");
      const mapping = JSON.parse(raw);

      it("has required top-level fields", () => {
        for (const field of schema.required) {
          expect(mapping).toHaveProperty(field);
        }
      });

      it("has valid server_patterns (non-empty array of strings)", () => {
        expect(Array.isArray(mapping.server_patterns)).toBe(true);
        expect(mapping.server_patterns.length).toBeGreaterThan(0);
        for (const p of mapping.server_patterns) {
          expect(typeof p).toBe("string");
        }
      });

      it("has valid classification", () => {
        expect(["tool-type", "service-type"]).toContain(mapping.classification);
      });

      it("has valid cli section", () => {
        expect(mapping.cli).toHaveProperty("name");
        expect(mapping.cli).toHaveProperty("install");
        expect(mapping.cli).toHaveProperty("version_check");
        expect(typeof mapping.cli.name).toBe("string");
      });

      it("has valid env_vars array", () => {
        expect(Array.isArray(mapping.env_vars)).toBe(true);
        for (const v of mapping.env_vars) {
          expect(v).toHaveProperty("name");
          expect(v).toHaveProperty("required");
          expect(v).toHaveProperty("description");
          expect(typeof v.name).toBe("string");
          expect(typeof v.required).toBe("boolean");
        }
      });

      it("has at least one tool", () => {
        expect(Object.keys(mapping.tools).length).toBeGreaterThan(0);
      });

      it("each tool has subcommand and args", () => {
        for (const [name, tool] of Object.entries(mapping.tools) as [string, any][]) {
          expect(tool).toHaveProperty("subcommand");
          expect(tool).toHaveProperty("args");
          expect(typeof tool.subcommand).toBe("string");
          expect(Array.isArray(tool.args)).toBe(true);
        }
      });

      it("has no duplicate subcommands", () => {
        const subcommands = Object.values(mapping.tools).map((t: any) => t.subcommand);
        const unique = new Set(subcommands);
        expect(unique.size).toBe(subcommands.length);
      });

      it("has a wrapper_template string", () => {
        expect(typeof mapping.wrapper_template).toBe("string");
        expect(mapping.wrapper_template.length).toBeGreaterThan(0);
      });

      it("wrapper_template contains all subcommands", () => {
        for (const tool of Object.values(mapping.tools) as any[]) {
          expect(mapping.wrapper_template).toContain(tool.subcommand);
        }
      });

      it("has no extra properties", () => {
        const allowed = new Set(Object.keys(schema.properties));
        for (const key of Object.keys(mapping)) {
          expect(allowed.has(key)).toBe(true);
        }
      });
    });
  }
});
