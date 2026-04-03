# forget-mcp

## Project Overview

Skills that teach Claude to analyze MCP configurations, identify which servers can be replaced by curated CLI guides, and switch to direct CLI usage. No CLI tool, no npm package — just markdown files that Claude reads.

## Structure

```
skills/
  forget-mcp/SKILL.md   # Orchestrator: guides Claude through MCP replacement
  supabase/SKILL.md      # psql operations
  github/SKILL.md        # gh CLI operations
  filesystem/SKILL.md    # Built-in shell commands
  aws/SKILL.md           # aws CLI operations
  cloudflare/SKILL.md    # wrangler CLI operations
```

## How It Works

1. User copies `skills/*` to `.claude/skills/`
2. Claude reads the skill directories automatically
3. `forget-mcp/SKILL.md` guides Claude to scan MCP config, match servers to skills, verify prerequisites, and disable MCP entries
4. Individual skills teach Claude the exact CLI commands for each operation

## Adding a New Skill

1. Create `skills/{name}/SKILL.md` with frontmatter:
   ```yaml
   ---
   name: {name}
   trigger: keyword1, keyword2
   replaces_mcp: server-pattern1, server-pattern2
   ---
   ```
2. Include sections: Prerequisites, Operations (table), Output Handling, Common Errors
3. Update the mapping table in `forget-mcp/SKILL.md`

## Config Scopes (Claude Code)

| Scope | Canonical location |
|-------|-------------------|
| Local (default) | `~/.claude.json` → `projects[cwd].mcpServers` |
| Project | `.mcp.json` → `mcpServers` |
| User | `~/.claude.json` → root `mcpServers` |
| User | `~/.claude.json` → `projects[home].mcpServers` |

Precedence: local > project > user. Within user scope: root `mcpServers` > `projects[home]`.

Older setups may also have servers in `.claude/settings.local.json` or `~/.claude/settings.json`.
