import { McpCallToolResult, McpToolsListResult, JsonRpcRequest, JsonRpcResponse } from './mcpSchemas';
import { getSseUrlForServer, type SseMcpServerId } from './mcpSseServers';

const DEFAULT_TIMEOUT_MS = 25_000;

function makeId() {
  return Math.random().toString(36).slice(2);
}

// Parse an SSE stream of lines like:
// event: message
// data: {"jsonrpc":"2.0",...}
async function waitForResponse(params: {
  sseUrl: string;
  requestId: string;
  timeoutMs?: number;
}): Promise<JsonRpcResponse> {
  const { sseUrl, requestId, timeoutMs = DEFAULT_TIMEOUT_MS } = params;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(sseUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`SSE connect failed (${res.status}): ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Process complete events separated by double newlines
      const parts = buffer.split(/\n\n/);
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split(/\n/);
        for (const line of lines) {
          const m = line.match(/^data:\s*(.*)$/);
          if (!m) continue;
          const data = m[1];
          if (!data) continue;

          try {
            const msg = JSON.parse(data) as JsonRpcResponse;
            if (String(msg.id) === String(requestId)) {
              controller.abort();
              return msg;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    throw new Error('SSE stream ended without response');
  } catch (e: unknown) {
    const err = e as any;
    if (err?.name === 'AbortError') {
      throw new Error('SSE response timeout');
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// Common MCP SSE pattern:
// - Connect to an SSE url: /sse?...  (we have that full URL)
// - Send requests to a /message endpoint with the same query params
function toMessageUrl(sseUrl: string): string {
  const u = new URL(sseUrl);
  // Replace path ending in /sse with /message if present
  if (u.pathname.endsWith('/sse')) {
    u.pathname = u.pathname.replace(/\/sse$/, '/message');
  } else {
    // best-effort: append /message
    u.pathname = u.pathname.replace(/\/+$/, '') + '/message';
  }
  return u.toString();
}

async function sendRequest(sseUrl: string, req: JsonRpcRequest) {
  const msgUrl = toMessageUrl(sseUrl);
  const res = await fetch(msgUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SSE message POST failed (${res.status}): ${text}`);
  }
}

async function sseRpc<TResult>(serverId: SseMcpServerId, method: string, params?: unknown): Promise<TResult> {
  const sseUrl = getSseUrlForServer(serverId);
  const id = makeId();

  const req: JsonRpcRequest = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  };

  // Fire-and-wait: send request then listen for response on stream
  await sendRequest(sseUrl, req);
  const msg = await waitForResponse({ sseUrl, requestId: id });

  if (msg.error) throw new Error(msg.error.message);
  return msg.result as TResult;
}

export async function sseListTools(serverId: SseMcpServerId): Promise<McpToolsListResult> {
  // best-effort initialize
  try {
    await sseRpc(serverId, 'initialize', {
      clientInfo: { name: 'gumgenie-pro-ai', version: '0.0.0' },
      capabilities: {},
    });
  } catch {
    // ignore
  }

  return sseRpc<McpToolsListResult>(serverId, 'tools/list');
}

export async function sseCallTool(serverId: SseMcpServerId, toolName: string, args: unknown): Promise<McpCallToolResult> {
  try {
    await sseRpc(serverId, 'initialize', {
      clientInfo: { name: 'gumgenie-pro-ai', version: '0.0.0' },
      capabilities: {},
    });
  } catch {
    // ignore
  }

  return sseRpc<McpCallToolResult>(serverId, 'tools/call', {
    name: toolName,
    arguments: args,
  });
}
