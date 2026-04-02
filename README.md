# forget-mcp

Convert MCP servers into Skill documents + CLI wrappers. Kill context window overhead.

[English](#the-problem) | [中文](#问题)

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

1. **Scans** your Claude Code MCP config (`~/.claude.json` root and project-scoped, `.mcp.json`, and legacy settings files)
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

---

<a id="问题"></a>

# forget-mcp (中文)

把 MCP 服务器转换成 Skill 文档 + CLI 脚本，干掉上下文窗口的浪费。

## 问题

MCP 服务器会占用 AI 编码工具的大量上下文窗口。7-8 个服务器，光工具定义就烧掉 3-6 万 token，你还没开始打字呢。实测案例：20 万 token 的上下文，MCP 工具 schema 就吃掉了 14.3 万（72%）。

更深层的洞察：大多数 MCP 服务器只是已有 CLI 工具的薄封装。Supabase MCP 封装的是 `psql`，GitHub MCP 封装的是 `gh`，文件系统 MCP 封装的是 `ls`/`cat`/`grep`。

## 解决方案

```
之前：Claude -> MCP Server -> 外部系统 -> 数据 -> Claude
之后：Claude -> 生成命令 -> Bash 执行 -> 结果 -> Claude
```

forget-mcp 把 MCP 服务器转换成 Skill 文档（教 Claude 用 CLI 命令）+ 轻量 bash 脚本（控制输出截断）。不需要运行 MCP 服务器，上下文里也没有工具 schema。

## 快速开始

```bash
# 扫描你有哪些 MCP 服务器
npx forget-mcp scan

# 把一个服务器转换成 Skill + CLI 脚本
npx forget-mcp convert supabase

# 检查生成的输出
npx forget-mcp verify --dry supabase

# 查看迁移状态
npx forget-mcp status
```

## 它做了什么

1. **扫描** Claude Code 的 MCP 配置（`~/.claude.json`、`.mcp.json` 及旧版 settings 文件）
2. **匹配** 服务器到预置映射表（Supabase、GitHub、文件系统、AWS、Cloudflare）
3. **生成** `SKILL.md` + `tools/{name}.sh` 到 `.claude/skills/{name}/`
4. **提示禁用** MCP 服务器配置，释放上下文空间

### 生成的输出

```
.claude/skills/supabase/
  SKILL.md              # 操作映射、前置条件、错误处理
  tools/supabase.sh     # 轻量 bash 脚本，带输出截断
```

**SKILL.md** 教 Claude 用什么 CLI 命令替代每个 MCP 工具：

| MCP 工具 | CLI 命令 | 说明 |
|----------|---------|------|
| execute_sql | `supabase.sh query <sql>` | CSV 输出，大查询加 LIMIT N |
| list_tables | `supabase.sh tables` | CSV 输出 |
| get_table_schema | `supabase.sh schema <table>` | 文本输出 |

## 命令

| 命令 | 说明 |
|------|------|
| `forget-mcp scan` | 列出 Claude Code 配置中的 MCP 服务器 |
| `forget-mcp convert <server>` | 转换一个服务器为 Skill + CLI 脚本 |
| `forget-mcp convert --all` | 批量转换所有有映射的服务器 |
| `forget-mcp verify --dry <server>` | CI 安全检查（工具是否安装、环境变量是否设置） |
| `forget-mcp verify <server>` | 实际执行检查（需要真实凭据） |
| `forget-mcp status` | 显示已转换 vs 未转换的服务器 |
| `forget-mcp migrate` | 打印分步迁移指南 |

### 参数

| 参数 | 说明 |
|------|------|
| `--json` | JSON 格式输出（方便脚本调用） |
| `--global` | 写入 `~/.claude/skills/` 而非 `.claude/skills/` |
| `--disable` | 转换后自动禁用 MCP 配置（不提示） |
| `--keep` | 不提示禁用 MCP 配置 |
| `--force` | 覆盖已有的 skill，不提示 |

## 预置映射

Phase 1 包含 5 个预置映射：

| 服务器 | CLI 工具 | 映射工具数 |
|--------|---------|-----------|
| Supabase | `psql` | 6（query、tables、schema、extensions、migrations、migrate） |
| GitHub | `gh` | 12（issues、PRs、search、file、merge、diff） |
| 文件系统 | `ls`/`cat`/`find` | 9（cat、ls、stat、find、tree、write、mkdir、mv、edit） |
| AWS | `aws` | 7（S3、Lambda、CloudFormation、STS） |
| Cloudflare | `wrangler` | 9（Workers、KV、R2、D1、DNS） |

没有预置映射的服务器，forget-mcp 会尝试 MCP 自省（introspection）并生成 stub skill。

## 工作原理

### 有预置映射的服务器（推荐）

```
1. 解析配置 -> 找到服务器条目
2. 查找预置映射（不需要连接 MCP）
3. 从映射元数据生成 SKILL.md
4. 从 wrapper_template 生成 bash 脚本
5. 写入 .claude/skills/{name}/
6. 提示是否禁用 MCP 配置
```

### 没有映射的服务器（回退方案）

```
1. 解析配置 -> 找到服务器条目
2. 没找到预置映射
3. 启动 MCP 服务器，调用 tools/list
4. 生成 stub SKILL.md（标记为 incomplete，需要手动映射）
5. 写入 .claude/skills/{name}/
```

## 贡献映射

1. 按照 `src/mappings/schema.json` 的 JSON Schema 创建 `src/mappings/{name}.json`
2. 在 `src/mappings/index.ts` 中添加静态导入
3. 运行 `bun test test/mappings/validate.test.ts` 验证

每个映射有两部分：
- **`tools`**：SKILL.md 的元数据（子命令名、参数、输出格式、使用提示）
- **`wrapper_template`**：手写的 bash case 分支体

参考已有的映射文件。

## 开发

```bash
# 安装
bun install

# 直接运行
bun run src/cli.ts scan

# 测试
bun test              # 78 个测试

# 构建 npm 包
bun run build         # -> dist/cli.js（单文件，约 560KB）

# 测试构建产物
node dist/cli.js --help
```
