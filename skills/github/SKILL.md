---
name: github
trigger: github, issues, pull request, PR, repository, gh
replaces_mcp: github, @modelcontextprotocol/server-github, @github/mcp-server, github-mcp-server
---

# GitHub Operations

Use `gh` CLI directly instead of the GitHub MCP server.

## Prerequisites

- `gh` installed (`brew install gh` / `apt install gh`)
- Authenticated: `gh auth status` (run `gh auth login` if needed)
- Optional: `GITHUB_TOKEN` env var for non-interactive auth

## Operations

### Issues

| Operation | Command |
|-----------|---------|
| List issues | `gh issue list` |
| Get issue | `gh issue view <number>` |
| Create issue | `gh issue create --title "<title>" --body "<body>"` |
| Comment on issue | `gh issue comment <number> --body "<comment>"` |
| Search issues | `gh search issues "<query>" --repo <owner/repo>` |

### Pull Requests

| Operation | Command |
|-----------|---------|
| List PRs | `gh pr list` |
| Get PR | `gh pr view <number>` |
| Create PR | `gh pr create --title "<title>" --body "<body>"` |
| PR diff | `gh pr diff <number>` |
| Merge PR | `gh pr merge <number> --squash` |

### Code & Search

| Operation | Command |
|-----------|---------|
| Search code | `gh search code "<query>" --repo <owner/repo>` |
| Get file | See below |

**Get file contents:**
```bash
gh api repos/<owner>/<repo>/contents/<path> --jq '.content' | base64 -d
```

## Output Handling

- `gh` defaults to 30 items per page. Use `--limit <n>` to control.
- For large diffs: `gh pr diff <n> | head -500`
- JSON output: add `--json <fields>` to most commands
- For API calls: `gh api <endpoint> --jq '<filter>'`

## Tips

- Most commands auto-detect repo from current directory. Use `--repo owner/repo` for other repos.
- Use `gh api graphql -f query='...'` for complex queries not covered by built-in commands.
- Labels: `gh issue list --label "bug"`, `gh pr list --label "ready"`
- Assignees: `gh issue list --assignee @me`
