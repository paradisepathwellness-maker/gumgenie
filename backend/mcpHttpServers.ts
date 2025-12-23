export type HttpMcpServerId = 'notion' | 'gemini-image';

export type HttpMcpServerConfig = {
  id: HttpMcpServerId;
  label: string;
  url: string;
};

function backendBaseUrl(): string {
  // Used only to construct adapter URLs deterministically in dev.
  // Prefer explicit MCP_ADAPTER_BASE_URL when available.
  const explicit = process.env.MCP_ADAPTER_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const port = process.env.PORT || '4000';
  return `http://localhost:${port}`;
}

export function getHttpMcpServers(): HttpMcpServerConfig[] {
  return [
    {
      id: 'notion',
      label: 'Notion (MCP HTTP)',
      url: 'https://mcp.notion.com/mcp',
    },
    {
      // Local adapter that translates MCP JSON-RPC to the gemini-image-mcp REST API.
      id: 'gemini-image',
      label: 'Gemini Image (MCP HTTP via adapter)',
      url: `${backendBaseUrl()}/api/mcp-http-adapter/gemini-image`,
    },
  ];
}

export function getHttpMcpServer(id: HttpMcpServerId): HttpMcpServerConfig {
  const s = getHttpMcpServers().find((x) => x.id === id);
  if (!s) throw new Error(`Unknown HTTP MCP server: ${id}`);
  return s;
}
