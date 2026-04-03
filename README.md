# forget-mcp

AI operation guides that replace MCP servers with direct CLI usage. Kill context window overhead.

[English](#the-problem) | [中文](#问题)

## The Problem

MCP servers consume massive context window space in AI coding tools. With 7-8 servers, 30-60k tokens are burned on tool definitions alone before you type anything. One measured case: 143k of 200k tokens (72%) consumed by MCP tool schemas.

The deeper insight: most MCP servers are thin wrappers around CLI tools that already exist. Supabase MCP wraps `psql`. GitHub MCP wraps `gh`. Filesystem MCP wraps `ls`/`cat`/`grep`.

## The Fix

```
Before: Claude -> MCP Server -> External System -> Data -> Claude  (30-60k tokens overhead)
After:  Claude reads skill -> Runs CLI directly -> Result -> Claude  (< 1k tokens)
```

forget-mcp installs skill files that teach Claude the CLI commands directly. No MCP server running, no tool schemas in context, no intermediate wrapper scripts.

## Quick Start

```bash
# See what MCP servers you have and which skills are available
npx forget-mcp scan

# Install a skill (replaces MCP with direct CLI usage)
npx forget-mcp install supabase

# Install all available skills
npx forget-mcp install --all
```

After installing, Claude reads the skill and knows how to use `psql`/`gh`/`aws`/etc. directly. You can then disable the MCP server in your config to free context space.

## What It Does

1. **Scans** your Claude Code MCP config (`~/.claude.json` root and project-scoped, `.mcp.json`, and legacy settings files)
2. **Matches** servers against available skills (Supabase, GitHub, filesystem, AWS, Cloudflare)
3. **Installs** skill files to `.claude/skills/forget-mcp/` — Claude reads these automatically
4. **Includes** a meta-skill (`_meta.md`) that guides Claude through the MCP replacement process

### What Gets Installed

```
.claude/skills/forget-mcp/
  supabase.md     # psql commands, output handling, error patterns
  github.md       # gh CLI commands for issues, PRs, search
  _meta.md        # Guides Claude through scanning and disabling MCP servers
```

Each skill file teaches Claude:
- Which CLI commands replace each MCP operation
- How to handle output (truncation, formatting)
- Prerequisites (tools to install, env vars to set)
- Common errors and fixes

## Available Skills

| Skill | Replaces MCP | Uses CLI |
|-------|-------------|----------|
| supabase | Supabase MCP | `psql` + `supabase` CLI |
| github | GitHub MCP | `gh` CLI |
| filesystem | Filesystem MCP | Built-in shell commands |
| aws | AWS MCP | `aws` CLI |
| cloudflare | Cloudflare MCP | `wrangler` CLI |

## Commands

| Command | Description |
|---------|-------------|
| `forget-mcp scan` | List MCP servers and show skill availability |
| `forget-mcp install <server>` | Install a skill for one server |
| `forget-mcp install --all` | Install all available skills |

### Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for scripting) |
| `--global` | Write skills to `~/.claude/skills/` instead of `.claude/skills/` |

## How It Works

```
1. scan     → Reads MCP config, matches servers to available skills
2. install  → Copies skill markdown to .claude/skills/forget-mcp/
3. Claude   → Reads skill files automatically, uses CLI commands directly
4. You      → Disable the MCP server entry to free context space
```

The `_meta.md` skill also teaches Claude how to do the entire replacement process itself — scanning config, verifying prerequisites, and disabling MCP entries.

## Development

```bash
# Install
bun install

# Run directly
bun run src/cli.ts scan

# Test
bun test

# Build for npm
bun run build         # -> dist/cli.js (single file, ~580KB)

# Test built version
node dist/cli.js --help
```

## Contributing a Skill

1. Create `src/skills/{name}.md` with frontmatter (`name`, `trigger`, `replaces_mcp`)
2. Add a text import in `src/commands/install.ts`
3. Ensure a matching server pattern exists in `src/mappings/`
4. Run tests to verify

See existing skill files for the format.

## License

MIT

---

<a id="问题"></a>

# forget-mcp (中文)

AI 操作指南，用直接的 CLI 命令替代 MCP 服务器，干掉上下文窗口的浪费。

## 问题

MCP 服务器会占用 AI 编码工具的大量上下文窗口。7-8 个服务器，光工具定义就烧掉 3-6 万 token，你还没开始打字呢。实测案例：20 万 token 的上下文，MCP 工具 schema 就吃掉了 14.3 万（72%）。

更深层的洞察：大多数 MCP 服务器只是已有 CLI 工具的薄封装。Supabase MCP 封装的是 `psql`，GitHub MCP 封装的是 `gh`，文件系统 MCP 封装的是 `ls`/`cat`/`grep`。

## 解决方案

```
之前：Claude -> MCP Server -> 外部系统 -> 数据 -> Claude  (3-6万 token 开销)
之后：Claude 读 skill -> 直接跑 CLI -> 结果 -> Claude  (< 1k token)
```

forget-mcp 安装 skill 文件，直接教 Claude 用 CLI 命令操作。不需要运行 MCP 服务器，上下文里没有工具 schema，也没有中间脚本。

## 快速开始

```bash
# 扫描你有哪些 MCP 服务器，哪些有可用的 skill
npx forget-mcp scan

# 安装一个 skill（用直接 CLI 替代 MCP）
npx forget-mcp install supabase

# 安装所有可用 skill
npx forget-mcp install --all
```

安装后，Claude 会自动读取 skill 文件，直接使用 `psql`/`gh`/`aws` 等命令。然后你可以禁用 MCP 服务器配置来释放上下文空间。

## 它做了什么

1. **扫描** Claude Code 的 MCP 配置（`~/.claude.json` 根级和项目级、`.mcp.json` 及旧版 settings 文件）
2. **匹配** 服务器到可用 skill（Supabase、GitHub、文件系统、AWS、Cloudflare）
3. **安装** skill 文件到 `.claude/skills/forget-mcp/`——Claude 会自动读取
4. **包含** 元 skill（`_meta.md`）引导 Claude 完成 MCP 替换流程

### 安装的内容

```
.claude/skills/forget-mcp/
  supabase.md     # psql 命令、输出处理、错误模式
  github.md       # gh CLI 操作 issues、PR、搜索
  _meta.md        # 引导 Claude 扫描和禁用 MCP 服务器
```

每个 skill 文件教 Claude：
- 用什么 CLI 命令替代每个 MCP 操作
- 如何处理输出（截断、格式化）
- 前置条件（需要安装的工具、环境变量）
- 常见错误和修复方法

## 可用 Skill

| Skill | 替代 MCP | 使用 CLI |
|-------|---------|----------|
| supabase | Supabase MCP | `psql` + `supabase` CLI |
| github | GitHub MCP | `gh` CLI |
| filesystem | 文件系统 MCP | 内置 shell 命令 |
| aws | AWS MCP | `aws` CLI |
| cloudflare | Cloudflare MCP | `wrangler` CLI |

## 命令

| 命令 | 说明 |
|------|------|
| `forget-mcp scan` | 列出 MCP 服务器和 skill 可用情况 |
| `forget-mcp install <server>` | 安装一个 skill |
| `forget-mcp install --all` | 安装所有可用 skill |

### 参数

| 参数 | 说明 |
|------|------|
| `--json` | JSON 格式输出（方便脚本调用） |
| `--global` | 写入 `~/.claude/skills/` 而非 `.claude/skills/` |

## 开发

```bash
# 安装
bun install

# 直接运行
bun run src/cli.ts scan

# 测试
bun test

# 构建 npm 包
bun run build         # -> dist/cli.js（单文件，约 580KB）

# 测试构建产物
node dist/cli.js --help
```
