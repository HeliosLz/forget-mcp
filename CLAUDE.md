# forget-mcp

## Project Overview

Skills that teach Claude to analyze MCP configurations, identify which servers can be replaced by curated CLI guides, and switch to direct CLI usage. No CLI tool, no npm package — just markdown files that Claude reads.

## Structure

```
skills/
  supabase.md       # psql operations
  github.md         # gh CLI operations
  filesystem.md     # Built-in shell commands
  aws.md            # aws CLI operations
  cloudflare.md     # wrangler CLI operations
  _meta.md          # Orchestrator: guides Claude through MCP replacement
```

## How It Works

1. User copies `skills/` to `.claude/skills/forget-mcp/`
2. Claude reads the skill files automatically
3. `_meta.md` guides Claude to scan MCP config, match servers to skills, verify prerequisites, and disable MCP entries
4. Individual skills teach Claude the exact CLI commands for each operation

## Adding a New Skill

1. Create `skills/{name}.md` with frontmatter:
   ```yaml
   ---
   name: {name}
   trigger: keyword1, keyword2
   replaces_mcp: server-pattern1, server-pattern2
   ---
   ```
2. Include sections: Prerequisites, Operations (table), Output Handling, Common Errors
3. Update the mapping table in `_meta.md`

## Config Scopes (Claude Code)

| Scope | Canonical location | Legacy fallback |
|-------|-------------------|-----------------|
| Local (default) | `~/.claude.json` → `projects[cwd].mcpServers` | `.claude/settings.local.json` |
| User | `~/.claude.json` → root `mcpServers` | `~/.claude/settings.json` |
| User | `~/.claude.json` → `projects[home].mcpServers` | `~/.claude/settings.json` |
| Project | `.mcp.json` | — |

Precedence: local > project > user. Within user scope: root `mcpServers` > `projects[home]` > legacy settings files.
