import type { McpServerConfig } from "../config/types.js";

/**
 * Connect to an MCP server and list its tools.
 * Used only for unknown servers (no curated mapping).
 * Requires the MCP server to be startable (env vars set, etc).
 */
export async function connectAndListTools(config: McpServerConfig): Promise<string[]> {
  // Dynamic import to avoid loading the heavy SDK unless needed
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import(
    "@modelcontextprotocol/sdk/client/stdio.js"
  );

  if (!config.command) {
    throw new Error("Server config has no command. Cannot introspect.");
  }

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args || [],
    env: { ...process.env, ...config.env } as Record<string, string>,
  });

  const client = new Client({ name: "forget-mcp", version: "0.1.0" });

  const timeout = setTimeout(() => {
    transport.close?.();
    throw new Error("MCP server connection timed out (30s)");
  }, 30000);

  try {
    await client.connect(transport);
    const result = await client.listTools();
    clearTimeout(timeout);
    return result.tools.map((t) => t.name);
  } finally {
    clearTimeout(timeout);
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
  }
}
