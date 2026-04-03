# forget-mcp

## Project Overview

Skill-first tool that replaces MCP servers with AI operation guides. Instead of generating bash wrappers, it installs skill files that teach Claude how to use CLI tools directly — eliminating both MCP context overhead and intermediate scripts.

## Architecture

```
src/
  cli.ts                  Entry point, command router
  skills/                 Core product: hand-written skill markdown files
    supabase.md           Teaches Claude to use psql directly
    github.md             Teaches Claude to use gh directly
    filesystem.md         Teaches Claude to use built-in shell commands
    aws.md                Teaches Claude to use aws CLI directly
    cloudflare.md         Teaches Claude to use wrangler directly
    _meta.md              Meta skill: guides Claude through MCP replacement flow
  config/
    parser.ts             Parse Claude Code config scopes (local/user/project)
    writer.ts             Disable MCP entries (atomic: write .tmp -> rename)
    types.ts              TypeScript types
  mappings/
    index.ts              Mapping loader (pattern matching for server identification)
    schema.json           JSON Schema for mapping files
    *.json                Curated mappings (used for server pattern matching)
  commands/
    install.ts            Install skills to .claude/skills/forget-mcp/
    scan.ts               List MCP servers + skill availability
    convert.ts            [deprecated] Old wrapper generator
    verify.ts             [deprecated] Old smoke-test
    status.ts             [deprecated] Old status checker
    migrate.ts            [deprecated] Old migration guide
  generate/
    skill.ts              [deprecated] Old SKILL.md generator
    wrapper.ts            [deprecated] Old bash wrapper generator
  introspect/
    connector.ts          MCP SDK client for unknown servers
    classifier.ts         Tool-type vs service-type classification
  utils/
    output.ts             Pretty terminal output + --json flag
```

## Key Design Decisions

- **Skills are the product.** Hand-written markdown files that teach Claude CLI operations directly. No intermediate bash wrappers.
- **Mappings drive pattern matching.** JSON mapping files are still used to identify which MCP server maps to which skill, but the skill content lives in markdown.
- **_meta.md is the orchestrator.** A meta-skill that guides Claude through the entire MCP replacement flow — scan, match, verify, disable.
- **Single-file build.** Skill markdown is imported as text and bundled into the JS output. Zero runtime file reads.
- **Deprecated commands preserved.** Old convert/verify/status/migrate still work but emit warnings.

## Commands

```bash
bun run src/cli.ts scan              # List MCP servers + skill availability
bun run src/cli.ts install supabase  # Install one skill
bun run src/cli.ts install --all     # Install all skills
bun test                             # Tests
bun run build                        # Build to dist/cli.js
```

## Testing

```bash
bun test                    # All tests
bun test test/mappings/     # Mapping validation only
bun test test/config/       # Config parser tests
bun test test/commands/     # Command tests
```

Tests use `bun:test`. No external test dependencies.

## Adding a New Skill

1. Create `src/skills/{name}.md` with frontmatter (name, trigger, replaces_mcp)
2. Add text import in `src/commands/install.ts`
3. Add to `SKILLS` map in `src/commands/install.ts`
4. Ensure a matching mapping exists in `src/mappings/` for server pattern matching
5. Run tests to verify

## Config Scopes (Claude Code)

| Scope | Canonical location | Legacy fallback | Added via |
|-------|-------------------|-----------------|-----------|
| Local (default) | `~/.claude.json` → `projects[cwd].mcpServers` | `.claude/settings.local.json` | `claude mcp add` |
| User | `~/.claude.json` → root `mcpServers` | `~/.claude/settings.json` | manual edit |
| User | `~/.claude.json` → `projects[home].mcpServers` | `~/.claude/settings.json` | `claude mcp add -s user` |
| Project | `.mcp.json` | — | `claude mcp add -s project` |

Precedence: local > project > user. Within user scope: root `mcpServers` > `projects[home]` > legacy settings files.
