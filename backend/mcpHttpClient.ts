import type { JsonRpcRequest, JsonRpcResponse, McpCallToolResult, McpToolsListResult } from './mcpSchemas';

const DEFAULT_TIMEOUT_MS = 25_000;

function makeId() {
  return Math.random().toString(36).slice(2);
}

async function httpRpc<TResult>(params: {
  url: string;
  method: string;
  rpcParams?: unknown;
  timeoutMs?: number;
  headers?: Record<string, string>;
}): Promise<TResult> {
  const { url, method, rpcParams, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = params;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const id = makeId();
    const payload: JsonRpcRequest = { jsonrpc: '2.0', id, method, params: rpcParams };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text().catch(() => '');
    if (!res.ok) {
      const trimmed = String(text || '').slice(0, 500);
      const redacted = trimmed.replace(/access_token"\s*:\s*"[^"]+"/gi, 'access_token":"[REDACTED]"');
      throw new Error(`MCP HTTP failed (${res.status}): ${redacted}`);
    }

    let msg: JsonRpcResponse<TResult>;
    try {
      msg = JSON.parse(text) as JsonRpcResponse<TResult>;
    } catch {
      throw new Error('Invalid JSON from MCP HTTP server');
    }

    if (msg.error) throw new Error(msg.error.message);
    return msg.result as TResult;
  } catch (e: unknown) {
    const err = e as any;
    if (err?.name === 'AbortError') throw new Error('MCP HTTP timeout');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export async function httpInitialize(params: {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): Promise<void> {
  const { url, headers, timeoutMs } = params;
  try {
    await httpRpc({
      url,
      method: 'initialize',
      rpcParams: { clientInfo: { name: 'gumgenie-pro-ai', version: '0.0.0' }, capabilities: {} },
      headers,
      timeoutMs,
    });
  } catch {
    // best-effort (some servers don't require init)
  }
}

export async function httpListTools(params: {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): Promise<McpToolsListResult> {
  const { url, headers, timeoutMs } = params;
  await httpInitialize({ url, headers, timeoutMs });
  return httpRpc<McpToolsListResult>({ url, method: 'tools/list', headers, timeoutMs });
}

export async function httpCallTool(params: {
  url: string;
  toolName: string;
  args: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): Promise<McpCallToolResult> {
  const { url, toolName, args, headers, timeoutMs } = params;
  await httpInitialize({ url, headers, timeoutMs });
  return httpRpc<McpCallToolResult>({
    url,
    method: 'tools/call',
    rpcParams: { name: toolName, arguments: args },
    headers,
    timeoutMs,
  });
}
