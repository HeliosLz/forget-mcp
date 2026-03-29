# forget-mcp

Convert MCP servers into Skill documents + CLI wrappers. Kill context window overhead.

## The Problem

MCP servers consume massive context window space in AI coding tools. With 7-8 servers, 30-60k tokens are burned on tool definitions alone before you type anything. One measured case: 143k of 200k tokens (72%) consumed by MCP tool schemas.

The deeper insight: most MCP servers are thin wrappers around CLI tools that already exist. Supabase MCP wraps `psql`. GitHub MCP wraps `gh`. Filesystem MCP wraps `ls`/`cat`/`grep`.

## The Fix

```
Before: Claude -> MCP Server -> External System -> Data -> Claude
After:  Claude -> Generate Command -> Bash Execute -> Result -> Claude
```

forget-mcp converts MCP servers into Skill documents that teach Claude the CLI commands, plus thin bash wrappers for output truncation. No MCP server running, no tool schemas in context.

## Quick Start

```bash
# See what MCP servers you have
npx forget-mcp scan

# Convert a server to Skill + CLI wrapper
npx forget-mcp convert supabase

# Check the output
npx forget-mcp verify --dry supabase

# See migration status
npx forget-mcp status
```

## What It Does

1. **Scans** your Claude Code MCP config (all 3 scopes: local, user, project)
2. **Matches** servers against curated mappings (Supabase, GitHub, filesystem, AWS, Cloudflare)
3. **Generates** a `SKILL.md` + `tools/{name}.sh` in `.claude/skills/{name}/`
4. **Offers to disable** the MCP server entry so context is freed

### Generated Output

```
.claude/skills/supabase/
  SKILL.md              # Operation mapping, prerequisites, error patterns
  tools/supabase.sh     # Thin bash wrapper with output truncation
```

**SKILL.md** teaches Claude which CLI command replaces each MCP tool:

| MCP Tool | CLI Command | Notes |
|----------|-------------|-------|
| execute_sql | `supabase.sh query <sql>` | CSV output. Add LIMIT N for large queries |
| list_tables | `supabase.sh tables` | CSV output |
| get_table_schema | `supabase.sh schema <table>` | Text output |

**tools/supabase.sh** is a thin bash wrapper (~20 lines):

```bash
case "${1:-}" in
  query)
    psql "$DATABASE_URL" --csv -c "$2" | head -n "$MAX_LINES"
    ;;
  tables)
    psql "$DATABASE_URL" --csv -c "SELECT ..." | head -n "$MAX_LINES"
    ;;
  # ...
esac
```

## Commands

| Command | Description |
|---------|-------------|
| `forget-mcp scan` | List MCP servers from Claude Code config |
| `forget-mcp convert <server>` | Convert one server to Skill + CLI wrapper |
| `forget-mcp convert --all` | Convert all servers with curated mappings |
| `forget-mcp verify --dry <server>` | CI-safe check (tools installed, env vars set) |
| `forget-mcp verify <server>` | Live check (executes commands against real infra) |
| `forget-mcp status` | Show converted vs unconverted servers |
| `forget-mcp migrate` | Print step-by-step migration guide |

### Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for scripting) |
| `--global` | Write skills to `~/.claude/skills/` instead of `.claude/skills/` |
| `--disable` | Auto-disable MCP entry after convert (no prompt) |
| `--keep` | Don't prompt to disable MCP entry |
| `--force` | Overwrite existing skills without prompting |

## Curated Mappings

Phase 1 includes 5 curated mappings:

| Server | CLI Tool | Tools Mapped |
|--------|----------|-------------|
| Supabase | `psql` | 6 (query, tables, schema, extensions, migrations, migrate) |
| GitHub | `gh` | 12 (issues, PRs, search, file contents, merge, diff) |
| Filesystem | `ls`/`cat`/`find` | 9 (cat, ls, stat, find, tree, write, mkdir, mv, edit) |
| AWS | `aws` | 7 (S3, Lambda, CloudFormation, STS) |
| Cloudflare | `wrangler` | 9 (Workers, KV, R2, D1, DNS) |

For servers without curated mappings, forget-mcp attempts MCP introspection and generates stub skills.

## How It Works

### For curated servers (recommended)

```
1. Parse config -> find server entry
2. Lookup curated mapping (no MCP connection needed)
3. Generate SKILL.md from mapping metadata
4. Generate bash wrapper from mapping.wrapper_template
5. Write to .claude/skills/{name}/
6. Prompt to disable MCP entry
```

### For unknown servers (fallback)

```
1. Parse config -> find server entry
2. No curated mapping found
3. Start MCP server, call tools/list
4. Generate stub SKILL.md (status: incomplete, needs manual mapping)
5. Write to .claude/skills/{name}/
```

## Contributing a Mapping

1. Create `src/mappings/{name}.json` following the JSON Schema in `src/mappings/schema.json`
2. Add a static import in `src/mappings/index.ts`
3. Run `bun test test/mappings/validate.test.ts` to verify

Each mapping has two parts:
- **`tools`**: metadata for SKILL.md (subcommand names, args, output format, guidance)
- **`wrapper_template`**: hand-written bash case body for the wrapper script

See existing mappings for examples.

## Development

```bash
# Install
bun install

# Run directly
bun run src/cli.ts scan

# Test
bun test              # 78 tests

# Build for npm
bun run build         # -> dist/cli.js (single file, ~560KB)

# Test built version
node dist/cli.js --help
```

## License

MIT
