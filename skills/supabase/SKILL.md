---
name: supabase
trigger: database, SQL, supabase, psql, migration, postgres
replaces_mcp: supabase, @supabase/mcp-server-supabase, supabase-mcp
---

# Supabase Operations

Use `psql` and `supabase` CLI directly instead of the Supabase MCP server.

## Prerequisites

- `psql` installed (`brew install postgresql` / `apt install postgresql-client`)
- Environment variable `DATABASE_URL` set (connection string)
- Optional: `supabase` CLI for migrations (`npm i -g supabase`)

Verify: `psql "$DATABASE_URL" -c "SELECT 1"`

## Operations

| Operation | Command |
|-----------|---------|
| Execute SQL | `psql "$DATABASE_URL" --csv -c "<sql>"` |
| List tables | `psql "$DATABASE_URL" --csv -c "SELECT tablename FROM pg_tables WHERE schemaname='public'"` |
| Table schema | `psql "$DATABASE_URL" -c "\d <table>"` |
| List extensions | `psql "$DATABASE_URL" --csv -c "SELECT extname, extversion FROM pg_extension"` |
| List migrations | `supabase migration list --db-url "$DATABASE_URL"` |
| Apply migration | `supabase migration up --db-url "$DATABASE_URL"` |

## Output Handling

- Use `--csv` for machine-readable output
- Large result sets: add `LIMIT 200` to query or pipe through `| head -200`
- Always tell the user when output is truncated

## Multi-Statement Transactions

For multiple SQL statements in a transaction, write to a temp file:

```bash
cat <<'SQL' > /tmp/tx.sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
SQL
psql "$DATABASE_URL" -f /tmp/tx.sql
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `connection refused` | DB not running or bad URL | Check `DATABASE_URL` |
| `permission denied` | Insufficient privileges | Check DB user role |
| `relation does not exist` | Wrong table/schema | Use `schema_name.table_name` |
| `SSL connection required` | Missing SSL param | Append `?sslmode=require` to URL |
