---
name: cloudflare
trigger: cloudflare, workers, kv, r2, d1, dns, wrangler
replaces_mcp: cloudflare, @cloudflare/mcp-server-cloudflare, cloudflare-mcp
---

# Cloudflare Operations

Use `wrangler` CLI (and Cloudflare API fallback) instead of the Cloudflare MCP server.

## Prerequisites

- `wrangler` installed (`npm i -g wrangler`)
- Authenticated: `wrangler whoami` (run `wrangler login` if needed)
- Optional: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for API fallback

## Operations

### Workers

| Operation | Command |
|-----------|---------|
| List workers | See API fallback below |
| List deployments | `wrangler deployments list` (current project) |
| Deploy worker | `wrangler deploy` (from project root) |
| Tail logs | `wrangler tail <worker-name>` |

### KV

| Operation | Command |
|-----------|---------|
| List namespaces | `wrangler kv namespace list` |
| Get value | `wrangler kv key get --namespace-id <ns-id> "<key>"` |
| Put value | `wrangler kv key put --namespace-id <ns-id> "<key>" "<value>"` |
| List keys | `wrangler kv key list --namespace-id <ns-id>` |

### R2

| Operation | Command |
|-----------|---------|
| List buckets | `wrangler r2 bucket list` |
| List objects | `wrangler r2 object list <bucket>` |
| Get object | `wrangler r2 object get <bucket>/<key>` |
| Put object | `wrangler r2 object put <bucket>/<key> --file <path>` |

### D1

| Operation | Command |
|-----------|---------|
| List databases | `wrangler d1 list` |
| Execute SQL | `wrangler d1 execute <db-name> --command "<sql>"` |
| Execute file | `wrangler d1 execute <db-name> --file <path>` |

### DNS

| Operation | Command |
|-----------|---------|
| List records | See below |

**List DNS records (API fallback):**
```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/<zone-id>/dns_records" | jq '.result[]'
```

## Output Handling

- Most `wrangler` commands output JSON by default
- KV list may be large: pipe through `| jq '.[:20]'` to limit
- D1 query results: add `LIMIT 200` to SQL for large tables

## API Fallback

When `wrangler` doesn't support an operation, use the Cloudflare API directly:

**List all workers (account-level):**
```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts" | jq '.result[].id'
```

**General API pattern:**
```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/<endpoint>" | jq '.'
```

## Tips

- Use `wrangler dev` for local development and testing.
- D1 queries are read-only by default in production; use `--local` for writes during dev.
- Check `wrangler.toml` in project root for bindings and configuration.
