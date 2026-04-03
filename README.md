# forget-mcp

Skills that teach Claude to analyze MCP servers and replace them with direct CLI usage. Kill context window overhead.

[English](#the-problem) | [中文](#问题)

## The Problem

MCP servers add an extra layer between the AI and the tools it uses. In some clients, this means tool definitions are loaded into context; in others, it adds process overhead and indirection.

The deeper insight: most MCP servers are thin wrappers around CLI tools that already exist. Supabase MCP wraps `psql`. GitHub MCP wraps `gh`. Filesystem MCP wraps `ls`/`cat`/`grep`.

## The Fix

```
Before: Claude -> MCP Server -> External System -> Data -> Claude  (extra indirection layer)
After:  Claude reads skill -> Runs CLI directly -> Result -> Claude  (direct execution)
```

forget-mcp is a set of skills that teach Claude to analyze your MCP configuration, identify which servers can be replaced by curated CLI guides, and switch to direct CLI usage. Fewer moving parts, less indirection.

## Install

```bash
# Clone and copy skills into your project
git clone https://github.com/HeliosLz/forget-mcp.git /tmp/forget-mcp
mkdir -p .claude/skills
cp -r /tmp/forget-mcp/skills/* .claude/skills/
rm -rf /tmp/forget-mcp
```

Or copy individual skills:

```bash
# Just supabase (+ orchestrator)
mkdir -p .claude/skills/supabase .claude/skills/forget-mcp
curl -sL https://raw.githubusercontent.com/HeliosLz/forget-mcp/master/skills/supabase/SKILL.md \
  -o .claude/skills/supabase/SKILL.md
curl -sL https://raw.githubusercontent.com/HeliosLz/forget-mcp/master/skills/forget-mcp/SKILL.md \
  -o .claude/skills/forget-mcp/SKILL.md
```

That's it. Claude reads the skills automatically.

## What Happens Next

After installing, tell Claude to replace your MCP servers. The `forget-mcp` skill guides Claude through:

1. **Scan** your MCP config (`~/.claude.json`, `.mcp.json`, etc.)
2. **Match** servers to installed skills
3. **Verify** CLI tools are installed and configured
4. **Disable** MCP server entries (reversible — sets `"disabled": true`)

Or just use Claude normally — it will use the CLI commands from the skills instead of calling MCP servers.

## Available Skills

| Skill | Replaces MCP | Uses CLI |
|-------|-------------|----------|
| supabase | Supabase MCP | `psql` + `supabase` CLI |
| github | GitHub MCP | `gh` CLI |
| filesystem | Filesystem MCP | Built-in shell commands |
| aws | AWS MCP | `aws` CLI |
| cloudflare | Cloudflare MCP | `wrangler` CLI |
| forget-mcp | — | Orchestrates the MCP replacement process |

## Contributing a Skill

1. Create `skills/{name}/SKILL.md` with frontmatter (`name`, `trigger`, `replaces_mcp`)
2. Include: prerequisites, operation table, output handling, common errors
3. See existing skills for the format

## License

MIT

---

<a id="问题"></a>

# forget-mcp (中文)

教 Claude 自动解析 MCP 服务器的用法，将其转化为直接的 CLI 操作指南，干掉上下文窗口的浪费。

## 问题

MCP 服务器在 AI 和工具之间增加了一层间接层。在某些客户端中，这意味着工具定义会被加载到上下文；在其他客户端中，则增加了进程开销和间接调用。

更深层的洞察：大多数 MCP 服务器只是已有 CLI 工具的薄封装。Supabase MCP 封装的是 `psql`，GitHub MCP 封装的是 `gh`，文件系统 MCP 封装的是 `ls`/`cat`/`grep`。

## 解决方案

```
之前：Claude -> MCP Server -> 外部系统 -> 数据 -> Claude  (额外的间接层)
之后：Claude 读 skill -> 直接跑 CLI -> 结果 -> Claude  (直接执行)
```

forget-mcp 是一组 skill，教 Claude 分析你的 MCP 配置，识别哪些服务器可以用预置的 CLI 操作指南替代，然后切换到直接 CLI 调用。更少的活动部件，更少的间接调用。

## 安装

```bash
# 克隆并复制 skill 到你的项目
git clone https://github.com/HeliosLz/forget-mcp.git /tmp/forget-mcp
mkdir -p .claude/skills
cp -r /tmp/forget-mcp/skills/* .claude/skills/
rm -rf /tmp/forget-mcp
```

或只复制单个 skill：

```bash
# 只要 supabase（+ 编排器）
mkdir -p .claude/skills/supabase .claude/skills/forget-mcp
curl -sL https://raw.githubusercontent.com/HeliosLz/forget-mcp/master/skills/supabase/SKILL.md \
  -o .claude/skills/supabase/SKILL.md
curl -sL https://raw.githubusercontent.com/HeliosLz/forget-mcp/master/skills/forget-mcp/SKILL.md \
  -o .claude/skills/forget-mcp/SKILL.md
```

就这样。Claude 会自动读取 skill 文件。

## 安装后

告诉 Claude 替换你的 MCP 服务器。`forget-mcp` skill 会引导 Claude：

1. **扫描** MCP 配置（`~/.claude.json`、`.mcp.json` 等）
2. **匹配** 服务器到已安装的 skill
3. **验证** CLI 工具已安装和配置
4. **禁用** MCP 服务器条目（可逆——设置 `"disabled": true`）

或者直接正常使用 Claude——它会自动使用 skill 里的 CLI 命令，而不是调用 MCP 服务器。

## 可用 Skill

| Skill | 替代 MCP | 使用 CLI |
|-------|---------|----------|
| supabase | Supabase MCP | `psql` + `supabase` CLI |
| github | GitHub MCP | `gh` CLI |
| filesystem | 文件系统 MCP | 内置 shell 命令 |
| aws | AWS MCP | `aws` CLI |
| cloudflare | Cloudflare MCP | `wrangler` CLI |
| forget-mcp | — | 编排 MCP 替换流程 |

## 贡献 Skill

1. 创建 `skills/{name}/SKILL.md`，包含 frontmatter（`name`、`trigger`、`replaces_mcp`）
2. 包含：前置条件、操作表、输出处理、常见错误
3. 参考已有 skill 的格式
