export type SseMcpServerId = 'unframer';

export type SseMcpServerConfig = {
  id: SseMcpServerId;
  label: string;
  sseUrlEnvVar: string;
};

export function getSseMcpServers(): SseMcpServerConfig[] {
  return [
    {
      id: 'unframer',
      label: 'Unframer (hosted SSE)',
      sseUrlEnvVar: 'MCP_UNFRAMER_SSE_URL',
    },
  ];
}

export function getSseMcpServer(id: SseMcpServerId): SseMcpServerConfig {
  const s = getSseMcpServers().find((x) => x.id === id);
  if (!s) throw new Error(`Unknown SSE MCP server: ${id}`);
  return s;
}

export function getSseUrlForServer(id: SseMcpServerId): string {
  const cfg = getSseMcpServer(id);
  const url = process.env[cfg.sseUrlEnvVar];
  if (!url) throw new Error(`Missing required env var: ${cfg.sseUrlEnvVar}`);
  return url;
}
