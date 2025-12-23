import WebSocket from 'ws';
import { JsonRpcRequest, JsonRpcResponse, McpCallToolResult, McpToolsListResult } from './mcpSchemas';

const DEFAULT_TIMEOUT_MS = 20_000;

function toWsUrl(serverUrl: string): string {
  // Best-effort conversion:
  // - ws:// or wss:// => use as-is
  // - http(s)://host[/path] => convert to ws(s)://host[/path or /mcp]
  if (serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')) return serverUrl;

  if (serverUrl.startsWith('http://')) {
    const u = new URL(serverUrl);
    u.protocol = 'ws:';
    if (u.pathname === '/' || !u.pathname) u.pathname = '/mcp';
    return u.toString();
  }

  if (serverUrl.startsWith('https://')) {
    const u = new URL(serverUrl);
    u.protocol = 'wss:';
    if (u.pathname === '/' || !u.pathname) u.pathname = '/mcp';
    return u.toString();
  }

  // Fallback: assume it's a host
  return `wss://${serverUrl.replace(/\/+$/, '')}/mcp`;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

async function connect(wsUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, {
      handshakeTimeout: timeoutMs,
    });

    const safeClose = () => {
      try {
        ws.close();
      } catch {
        // ignore close errors
      }
    };

    const t = setTimeout(() => {
      safeClose();
      reject(new Error(`MCP connect timeout: ${wsUrl}`));
    }, timeoutMs);

    ws.once('open', () => {
      clearTimeout(t);
      resolve(ws);
    });

    ws.once('error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

async function rpc<TResult>(ws: WebSocket, method: string, params?: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<TResult> {
  const id = makeId();
  const payload: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

  return new Promise((resolve, reject) => {
    const onMessage = (data: WebSocket.RawData) => {
      try {
        const text = typeof data === 'string' ? data : data.toString('utf8');
        const msg = JSON.parse(text) as JsonRpcResponse<TResult>;
        if (String(msg.id) !== String(id)) return;

        cleanup();

        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result as TResult);
        }
      } catch (e: unknown) {
        cleanup();
        reject(new Error(e instanceof Error ? e.message : 'Invalid JSON-RPC response'));
      }
    };

    const onError = (err: unknown) => {
      cleanup();
      reject(err);
    };

    const t = setTimeout(() => {
      cleanup();
      reject(new Error(`MCP RPC timeout: ${method}`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(t);
      ws.off('message', onMessage);
      ws.off('error', onError);
    };

    ws.on('message', onMessage);
    ws.on('error', onError);

    ws.send(JSON.stringify(payload));
  });
}

export async function listTools(serverUrl: string): Promise<McpToolsListResult> {
  const wsUrl = toWsUrl(serverUrl);
  const ws = await connect(wsUrl);

  try {
    // MCP initialize is often required
    await rpc(ws, 'initialize', {
      clientInfo: { name: 'gumgenie-pro-ai', version: '0.0.0' },
      capabilities: {},
    });

    const tools = await rpc<McpToolsListResult>(ws, 'tools/list');
    return tools;
  } finally {
    try {
      ws.close();
    } catch {
      // ignore close errors
    }
  }
}

export async function callTool(serverUrl: string, toolName: string, args: unknown): Promise<McpCallToolResult> {
  const wsUrl = toWsUrl(serverUrl);
  const ws = await connect(wsUrl);

  try {
    await rpc(ws, 'initialize', {
      clientInfo: { name: 'gumgenie-pro-ai', version: '0.0.0' },
      capabilities: {},
    });

    const result = await rpc<McpCallToolResult>(ws, 'tools/call', {
      name: toolName,
      arguments: args,
    });

    return result;
  } finally {
    try {
      ws.close();
    } catch {
      // ignore close errors
    }
  }
}
