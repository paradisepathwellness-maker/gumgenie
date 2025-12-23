import { getHttpMcpServer } from './mcpHttpServers';
import { httpCallTool, httpListTools } from './mcpHttpClient';
import type { McpToolsListResult, McpCallToolResult } from './mcpSchemas';
import { getNotionToken, isConnectedToNotion } from './notion';

const toolCache: {
  fetchedAt: number;
  tools: McpToolsListResult | null;
} = {
  fetchedAt: 0,
  tools: null,
};

function notionHeaders(): Record<string, string> {
  const token = getNotionToken();
  if (!token) throw new Error('Not connected to Notion. Complete OAuth at /api/notion/oauth/start');
  return { Authorization: `Bearer ${token}` };
}

export async function listNotionMcpToolsCached(opts?: { force?: boolean }): Promise<McpToolsListResult> {
  if (!isConnectedToNotion()) throw new Error('Not connected to Notion. Complete OAuth at /api/notion/oauth/start');

  const force = Boolean(opts?.force);
  const now = Date.now();
  const ttlMs = 5 * 60 * 1000;
  if (!force && toolCache.tools && now - toolCache.fetchedAt < ttlMs) return toolCache.tools;

  const server = getHttpMcpServer('notion');
  const tools = await httpListTools({ url: server.url, headers: notionHeaders() });
  toolCache.tools = tools;
  toolCache.fetchedAt = now;
  return tools;
}

export async function callNotionMcpTool(params: {
  toolName: string;
  args: unknown;
  timeoutMs?: number;
}): Promise<McpCallToolResult> {
  if (!isConnectedToNotion()) throw new Error('Not connected to Notion. Complete OAuth at /api/notion/oauth/start');

  const server = getHttpMcpServer('notion');
  return httpCallTool({
    url: server.url,
    toolName: params.toolName,
    args: params.args || {},
    timeoutMs: params.timeoutMs,
    headers: notionHeaders(),
  });
}

// Optional: typed helper stubs (implemented later once we confirm tool names)
export function guessToolName(tools: McpToolsListResult, contains: string): string | null {
  const list: any[] = (tools as any).tools || [];
  const found = list.find((t) => typeof t?.name === 'string' && t.name.toLowerCase().includes(contains.toLowerCase()));
  return found?.name || null;
}
