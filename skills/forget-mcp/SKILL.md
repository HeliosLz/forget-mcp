---
name: forget-mcp
trigger: MCP, context window, forget-mcp, mcp overhead, replace mcp, disable mcp
---

# MCP Server Replacement Guide

This skill guides you through replacing MCP servers with direct CLI usage to free context window space.

## When to Use

When the user wants to:
- Reduce MCP context window overhead
- Replace an MCP server with direct CLI commands
- Check which MCP servers can be replaced
- Disable an MCP server after replacing it

## Step 1: Scan MCP Configuration

Read the user's MCP config from these locations (in precedence order):

1. `~/.claude.json` → `projects[cwd].mcpServers` (local scope)
2. `.mcp.json` → `mcpServers` (project scope)
3. `~/.claude.json` → root `mcpServers` (user scope)
4. `~/.claude.json` → `projects[home].mcpServers` (user scope)

Note: older setups may also have servers in `.claude/settings.local.json` or `~/.claude/settings.json`.

List all servers found with their scope.

## Step 2: Match Available Skills

Check `.claude/skills/` for installed skill directories (each contains a `SKILL.md`).

Available replacements:

| MCP Server Pattern | Skill | Replaces With |
|--------------------|-------|---------------|
| supabase, @supabase/* | supabase | `psql` + `supabase` CLI |
| github, @modelcontextprotocol/server-github | github | `gh` CLI |
| filesystem, @modelcontextprotocol/server-filesystem | filesystem | Built-in shell commands |
| aws, @aws/mcp-server | aws | `aws` CLI |
| cloudflare, @cloudflare/mcp-server-cloudflare | cloudflare | `wrangler` CLI |

Tell the user which servers have replacements and which don't.

## Step 3: Verify Prerequisites

For each server the user wants to replace, check the skill's prerequisites:
- Is the CLI tool installed? (run the version check command)
- Are required environment variables set?
- Is authentication configured?

Report any missing prerequisites with install instructions.

## Step 4: Disable MCP Entry

After the user confirms, disable the MCP server by setting `"disabled": true` in the config file where it was found. Do NOT delete the entry — disabling is reversible.

Example for `~/.claude.json`:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "disabled": true
    }
  }
}
```

## Important

- Always ask before disabling an MCP server
- The user can re-enable by removing `"disabled": true`
- If a skill file is missing, tell the user to copy it from the forget-mcp repo: `https://github.com/HeliosLz/forget-mcp/tree/master/skills`
- Servers without a matching skill cannot be replaced yet
