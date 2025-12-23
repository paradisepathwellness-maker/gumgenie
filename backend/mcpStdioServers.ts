export type StdioMcpServerId = 'shadcn' | 'magic' | 'magicui' | 'gumgenie';

export type StdioMcpServerConfig = {
  id: StdioMcpServerId;
  label: string;
  command: string;
  args: string[];
  env?: Record<string, string | undefined>;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getStdioMcpServers(): StdioMcpServerConfig[] {
  const servers: StdioMcpServerConfig[] = [
    {
      id: 'shadcn',
      label: 'shadcn (local)',
      // Official docs show: npx shadcn@latest mcp
      // We add -y to avoid interactive npx prompts in a headless backend.
      command: 'cmd',
      args: ['/c', 'npx', '-y', 'shadcn@latest', 'mcp'],
      env: {
        MCP_MODE: 'stdio',
        LOG_LEVEL: 'error',
        DISABLE_CONSOLE_OUTPUT: 'true',
      },
    },
    {
      id: 'magicui',
      label: '@magicuidesign/mcp (local)',
      // Official manual install:
      // { "command": "npx", "args": ["-y", "@magicuidesign/mcp@latest"] }
      // Use cmd /c on Windows to avoid npx spawn/stdio quirks.
      command: 'cmd',
      args: ['/c', 'npx', '-y', '@magicuidesign/mcp@latest'],
      env: {
        MCP_MODE: 'stdio',
        LOG_LEVEL: 'error',
        DISABLE_CONSOLE_OUTPUT: 'true',
      },
    },
    {
      // GumGenie-branded Notion MCP bridge via mcp-remote (stdio)
      // Official Notion docs example uses: npx -y mcp-remote https://mcp.notion.com/mcp
      // We avoid using "Notion" in the id/label per listing naming constraints.
      id: 'gumgenie',
      label: 'GumGenie Remote MCP (mcp-remote)',
      command: 'cmd',
      args: ['/c', 'npx', '-y', 'mcp-remote', 'https://mcp.notion.com/mcp'],
      env: {
        MCP_MODE: 'stdio',
        LOG_LEVEL: 'error',
        DISABLE_CONSOLE_OUTPUT: 'true',
      },
    },
  ];

  // Magic MCP as provided (Windows cmd /c npx -y ... API_KEY=...)
  // We do NOT hardcode the key. Put MAGIC_API_KEY in env.
  try {
    const key = requireEnv('MAGIC_API_KEY');
    servers.push({
      id: 'magic',
      label: '@21st-dev/magic (local)',
      command: 'cmd',
      args: ['/c', 'npx', '-y', '@21st-dev/magic@latest', `API_KEY="${key}"`],
      env: {
        MCP_MODE: 'stdio',
        LOG_LEVEL: 'error',
        DISABLE_CONSOLE_OUTPUT: 'true',
      },
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    console.error(errorMessage);

    // If MAGIC_API_KEY is not set, we still list the server but will error on start.
    servers.push({
      id: 'magic',
      label: '@21st-dev/magic (local)',
      command: 'cmd',
      args: ['/c', 'npx', '-y', '@21st-dev/magic@latest'],
      env: {
        MCP_MODE: 'stdio',
        LOG_LEVEL: 'error',
        DISABLE_CONSOLE_OUTPUT: 'true',
      },
    });
  }

  return servers;
}

export function getStdioMcpServer(serverId: StdioMcpServerId): StdioMcpServerConfig {
  const server = getStdioMcpServers().find((s) => s.id === serverId);
  if (!server) throw new Error(`Unknown stdio MCP server: ${serverId}`);
  return server;
}
