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

forget-mcp is a set of skill files. Copy them into your project, and Claude knows how to use CLI tools directly. No MCP server running, no tool schemas in context.

## Install

```bash
# Clone and copy skills into your project
git clone https://github.com/HeliosLz/forget-mcp.git /tmp/forget-mcp
mkdir -p .claude/skills/forget-mcp
cp /tmp/forget-mcp/skills/*.md .claude/skills/forget-mcp/
rm -rf /tmp/forget-mcp
```

Or copy individual skills:

```bash
# Just supabase
curl -sL https://raw.githubusercontent.com/HeliosLz/forget-mcp/master/skills/supabase.md \
  -o .claude/skills/forget-mcp/supabase.md --create-dirs
curl -sL https://raw.githubusercontent.com/HeliosLz/forget-mcp/master/skills/_meta.md \
  -o .claude/skills/forget-mcp/_meta.md
```

That's it. Claude reads the skills automatically.

## What Happens Next

After installing, tell Claude to replace your MCP servers. The `_meta.md` skill guides Claude through:

1. **Scan** your MCP config (`~/.claude.json`, `.mcp.json`, etc.)
2. **Match** servers to installed skills
3. **Verify** CLI tools are installed and configured
4. **Disable** MCP server entries (reversible — sets `"disabled": true`)

Or just use Claude normally — it will use the CLI commands from the skills instead of calling MCP servers.

## Available Skills

| Skill | Replaces MCP | Uses CLI |
|-------|-------------|----------|
| supabase.md | Supabase MCP | `psql` + `supabase` CLI |
| github.md | GitHub MCP | `gh` CLI |
| filesystem.md | Filesystem MCP | Built-in shell commands |
| aws.md | AWS MCP | `aws` CLI |
| cloudflare.md | Cloudflare MCP | `wrangler` CLI |
| _meta.md | — | Orchestrates the MCP replacement process |

## Contributing a Skill

1. Create `skills/{name}.md` with frontmatter (`name`, `trigger`, `replaces_mcp`)
2. Include: prerequisites, operation table, output handling, common errors
3. See existing skills for the format

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

forget-mcp 是一组 skill 文件。复制到项目里，Claude 就知道怎么直接用 CLI 工具。不需要运行 MCP 服务器，上下文里没有工具 schema。

## 安装

```bash
# 克隆并复制 skill 到你的项目
git clone https://github.com/HeliosLz/forget-mcp.git /tmp/forget-mcp
mkdir -p .claude/skills/forget-mcp
cp /tmp/forget-mcp/skills/*.md .claude/skills/forget-mcp/
rm -rf /tmp/forget-mcp
```

或只复制单个 skill：

```bash
# 只要 supabase
curl -sL https://raw.githubusercontent.com/HeliosLz/forget-mcp/master/skills/supabase.md \
  -o .claude/skills/forget-mcp/supabase.md --create-dirs
curl -sL https://raw.githubusercontent.com/HeliosLz/forget-mcp/master/skills/_meta.md \
  -o .claude/skills/forget-mcp/_meta.md
```

就这样。Claude 会自动读取 skill 文件。

## 安装后

告诉 Claude 替换你的 MCP 服务器。`_meta.md` 会引导 Claude：

1. **扫描** MCP 配置（`~/.claude.json`、`.mcp.json` 等）
2. **匹配** 服务器到已安装的 skill
3. **验证** CLI 工具已安装和配置
4. **禁用** MCP 服务器条目（可逆——设置 `"disabled": true`）

或者直接正常使用 Claude——它会自动使用 skill 里的 CLI 命令，而不是调用 MCP 服务器。

## 可用 Skill

| Skill | 替代 MCP | 使用 CLI |
|-------|---------|----------|
| supabase.md | Supabase MCP | `psql` + `supabase` CLI |
| github.md | GitHub MCP | `gh` CLI |
| filesystem.md | 文件系统 MCP | 内置 shell 命令 |
| aws.md | AWS MCP | `aws` CLI |
| cloudflare.md | Cloudflare MCP | `wrangler` CLI |
| _meta.md | — | 编排 MCP 替换流程 |

## 贡献 Skill

1. 创建 `skills/{name}.md`，包含 frontmatter（`name`、`trigger`、`replaces_mcp`）
2. 包含：前置条件、操作表、输出处理、常见错误
3. 参考已有 skill 的格式
