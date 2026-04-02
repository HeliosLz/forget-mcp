# forget-mcp

## Project Overview

CLI tool that converts MCP server configurations into Skill documents + thin bash CLI wrappers for Claude Code. Eliminates context window overhead from MCP tool definitions.

## Architecture

```
src/
  cli.ts                  Entry point, command router
  config/
    parser.ts             Parse Claude Code config scopes (local/user/project)
    writer.ts             Disable MCP entries (atomic: write .tmp -> rename)
    types.ts              TypeScript types
  mappings/
    index.ts              Mapping loader (static imports, bundled into single JS)
    schema.json           JSON Schema for mapping files
    *.json                Curated mappings (supabase, github, filesystem, aws, cloudflare)
  introspect/
    connector.ts          MCP SDK client for unknown servers
    classifier.ts         Tool-type vs service-type (lookup + heuristic)
  generate/
    skill.ts              SKILL.md generator from mapping metadata
    wrapper.ts            Bash wrapper generator from mapping.wrapper_template
  commands/
    scan.ts               List MCP servers from config
    convert.ts            Orchestrate: parse -> lookup -> generate -> prompt disable
    verify.ts             Smoke-test wrappers (--dry for CI, live for real infra)
    status.ts             Show converted vs unconverted
    migrate.ts            Print step-by-step migration guide to stdout
  utils/
    output.ts             Pretty terminal output + --json flag
```

## Key Design Decisions

- **Mappings are the product.** MCP tool schemas don't contain CLI commands. The curated JSON mapping files are hand-written data, not generated code.
- **`wrapper_template` is bash, not structured data.** Each mapping has a hand-written bash case body. No DSL for shell variable references. This avoids the `$DATABASE_URL`-in-JSON ambiguity.
- **Mapping-only for curated servers.** No MCP introspection needed when we have a mapping. Introspection is only for unknown servers.
- **Output directly to `.claude/skills/`.** Claude Code reads skills from this path. No intermediate directory.
- **Atomic config writes.** Disabling MCP entries writes to `.tmp` then `rename()`. If process dies mid-write, original config is intact.
- **Single-file build.** `bun build --target=node` produces one 560KB JS file. Zero runtime deps for end users via `npx`.

## Commands

```bash
bun run src/cli.ts scan              # Dev: run directly
bun run src/cli.ts convert supabase --keep
bun run src/cli.ts verify --dry supabase
bun test                             # 81 tests
bun run build                        # Build to dist/cli.js
node dist/cli.js --help              # Test built version
```

## Testing

```bash
bun test                    # All tests
bun test test/mappings/     # Mapping validation only
bun test test/generate/     # Generator tests only
```

Tests use `bun:test`. Mapping validation checks all JSON files against `schema.json`. No external test dependencies.

## Adding a New Mapping

1. Create `src/mappings/{name}.json` following `schema.json`
2. Add static import in `src/mappings/index.ts`
3. Run `bun test test/mappings/validate.test.ts` to verify
4. The `wrapper_template` field is the hand-written bash case body

## Config Scopes (Claude Code)

| Scope | Canonical location | Legacy fallback | Added via |
|-------|-------------------|-----------------|-----------|
| Local (default) | `~/.claude.json` → `projects[cwd].mcpServers` | `.claude/settings.local.json` | `claude mcp add` |
| User | `~/.claude.json` → root `mcpServers` | `~/.claude/settings.json` | manual edit |
| User | `~/.claude.json` → `projects[home].mcpServers` | `~/.claude/settings.json` | `claude mcp add -s user` |
| Project | `.mcp.json` | — | `claude mcp add -s project` |

Precedence: local > project > user. Within user scope: root `mcpServers` > `projects[home]` > legacy settings files.
