/** A single MCP server entry from Claude Code config */
export interface McpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: "stdio" | "http" | "sse";
  url?: string;
}

/** Parsed config from one scope */
export interface ScopeConfig {
  scope: "local" | "user" | "project";
  path: string;
  servers: Record<string, McpServerConfig>;
}

/** Merged server entry with source scope info */
export interface ResolvedServer {
  name: string;
  config: McpServerConfig;
  scope: "local" | "user" | "project";
  configPath: string;
  /** When from ~/.claude.json, the projects[key] this server lives under */
  projectKey?: string;
}

/** Tool metadata in a curated mapping */
export interface MappingTool {
  subcommand: string;
  args: string[];
  output_format?: string;
  guidance?: string;
}

/** Curated mapping file structure */
export interface CuratedMapping {
  $schema?: string;
  server_patterns: string[];
  classification: "tool-type" | "service-type";
  cli: {
    name: string;
    install: Record<string, string>;
    version_check: string;
  };
  env_vars: Array<{
    name: string;
    required: boolean;
    description: string;
  }>;
  tools: Record<string, MappingTool>;
  wrapper_template: string;
  notes?: string;
}

/** Result of a conversion */
export interface ConvertResult {
  server: string;
  skillPath: string;
  wrapperPath: string;
  toolsMapped: number;
  toolsStubbed: number;
}
