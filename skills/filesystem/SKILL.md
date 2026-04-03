---
name: filesystem
trigger: filesystem, file, directory, read file, write file, search files
replaces_mcp: filesystem, @modelcontextprotocol/server-filesystem, mcp-server-filesystem
---

# Filesystem Operations

Use built-in shell commands directly instead of the Filesystem MCP server.

## Prerequisites

None. All commands are standard Unix tools available on macOS and Linux.

## Operations

| Operation | Command |
|-----------|---------|
| Read file | `cat <path>` |
| Read first N lines | `head -n <N> <path>` |
| Read last N lines | `tail -n <N> <path>` |
| List directory | `ls -la <path>` |
| File info | `stat <path>` |
| Search by name | `find <dir> -name "<pattern>"` |
| Search by content | `grep -r "<pattern>" <dir>` |
| Directory tree | `tree -L <depth> <dir>` or `find <dir> -type f` |
| Write file | Write tool (prefer Edit tool for modifications) |
| Create directory | `mkdir -p <path>` |
| Move/rename | `mv <src> <dst>` |

## Output Handling

- Large files: use `head -200 <file>` instead of `cat`
- Recursive searches: add `| head -100` to limit output
- `tree` on large directories: always use `-L 2` or `-L 3` depth limit
- Binary files: use `file <path>` to check type before reading

## Tips

- Prefer Claude Code's built-in Read/Write/Edit/Glob/Grep tools over shell commands when available — they provide better UX and permission controls.
- Use `wc -l <file>` to check file size before reading.
- Use `find . -name "*.ts" -newer <reference-file>` to find recently changed files.
- Use `du -sh <dir>` to check directory size.
