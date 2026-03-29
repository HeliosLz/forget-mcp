# TODOS

## Phase 2: Template Argument Language
**What:** Design a richer argument transformation system for MCP tool schemas with complex JSON-typed args (objects, arrays, booleans, optionals, nested paths).
**Why:** Phase 1 curated mappings use simple command arrays + args_append. This works for hand-written mappings but breaks for automated/LLM-assisted generation of unknown servers.
**Context:** The outside voice flagged `{sql:shell-escape}` as the load-bearing joint with only one modifier defined. MCP tools like Notion's `create_page` have deeply nested input schemas. The transformation language needs to handle: type coercion (JSON→CLI args), optional args, nested object flattening, array serialization.
**Depends on:** Phase 1 shipping + real-world usage data showing which argument patterns are most common.

## Phase 2: Version Drift Detection
**What:** Detect when an MCP server updates its tools and the generated Skill becomes stale.
**Why:** Curated mappings are frozen in time. If Supabase MCP adds a new `create_function` tool, the generated Skill won't include it. Users need to know when to re-convert.
**Context:** For curated servers, we skip introspection (mapping-only). So there's no automatic way to detect server changes. Options: (a) `forget-mcp status` compares installed pack metadata.source_mcp_version against the actual installed npm package version, (b) registry tracks latest tested versions.
**Depends on:** Phase 2 registry (pack metadata includes `source_mcp_version` and `last_tested`).
