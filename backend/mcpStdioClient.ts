import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { JsonRpcNotification, JsonRpcRequest, JsonRpcResponse, McpCallToolResult, McpToolsListResult } from './mcpSchemas';
import { getStdioMcpServer, StdioMcpServerId } from './mcpStdioServers';

const DEFAULT_TIMEOUT_MS = 25_000;
// Keep init timeout short so API returns diagnostics quickly if an MCP server is slow/failing.
const INIT_TIMEOUT_MS = 20_000;

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type ProcState = {
  proc: ChildProcessWithoutNullStreams;
  pending: Map<string, Pending>;
  initialized: boolean;
  stderrTail: string[];
};

const STDERR_TAIL_MAX = 40;

function pushStderr(state: ProcState, chunk: unknown) {
  const text = Buffer.isBuffer(chunk)
    ? chunk.toString('utf8')
    : typeof chunk === 'string'
      ? chunk
      : String(chunk);

  const lines = text.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    state.stderrTail.push(line);
    if (state.stderrTail.length > STDERR_TAIL_MAX) {
      state.stderrTail.shift();
    }
  }
}

export function getStdioServerDiagnostics(serverId: StdioMcpServerId): { stderrTail: string[]; initialized: boolean } {
  const state = processes.get(serverId);
  return {
    stderrTail: state?.stderrTail || [],
    initialized: state?.initialized || false,
  };
}


const processes = new Map<StdioMcpServerId, ProcState>();

function makeId() {
  return Math.random().toString(36).slice(2);
}

function startProcess(serverId: StdioMcpServerId): ProcState {
  const cfg = getStdioMcpServer(serverId);

  const proc = spawn(cfg.command, cfg.args, {
    env: { ...process.env, ...(cfg.env || {}) },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  // Ensure child process errors never crash the backend process.
  proc.on('error', (err) => {
    // captured in stderrTail by below handler too
    // eslint-disable-next-line no-console
    console.error(`MCP stdio child error (${serverId}):`, err);
  });

  const pending = new Map<string, Pending>();

  // Robust stdout parsing: MCP servers may emit JSON-RPC not strictly one-object-per-line.
  // We buffer chunks and attempt to extract JSON objects. Non-JSON noise is ignored.
  let stdoutBuf = '';

  const handleJsonRpcMessage = (msg: JsonRpcResponse) => {
    // Some MCP bridges (notably remote transports) may respond with id:null on protocol-level errors.
    // If that happens, fail fast so callers don't sit until timeout.
    if ((msg as any)?.id === null && (msg as any)?.error) {
      const errMsg = (msg as any).error?.message || 'MCP stdio error (id:null)';
      for (const [pid, p] of pending.entries()) {
        clearTimeout(p.timeout);
        p.reject(new Error(errMsg));
        pending.delete(pid);
      }
      return;
    }

    const id = String((msg as any).id);
    const p = pending.get(id);
    if (!p) return;

    clearTimeout(p.timeout);
    pending.delete(id);

    if ((msg as any).error) {
      p.reject(new Error((msg as any).error.message));
    } else {
      p.resolve((msg as any).result);
    }
  };

  const tryConsumeBuffer = () => {
    // Fast-path: newline-delimited JSON
    for (;;) {
      const nl = stdoutBuf.indexOf('\n');
      if (nl === -1) break;
      const line = stdoutBuf.slice(0, nl).trim();
      stdoutBuf = stdoutBuf.slice(nl + 1);
      if (!line) continue;

      try {
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (msg && msg.jsonrpc === '2.0' && msg.id !== undefined) {
          handleJsonRpcMessage(msg);
        }
      } catch {
        // ignore non-json noise lines
      }
    }

    // Fallback: attempt to extract JSON objects even without newlines.
    // Strategy: find first '{' and attempt incremental JSON.parse until it succeeds.
    let start = stdoutBuf.indexOf('{');
    while (start !== -1) {
      let end = start + 1;
      let parsed: any = null;

      while (end <= stdoutBuf.length) {
        const candidate = stdoutBuf.slice(start, end);
        try {
          parsed = JSON.parse(candidate);
          break;
        } catch {
          end += 1;
        }
      }

      if (parsed) {
        // Remove consumed prefix
        stdoutBuf = stdoutBuf.slice(end);
        if (parsed && parsed.jsonrpc === '2.0' && parsed.id !== undefined) {
          handleJsonRpcMessage(parsed as JsonRpcResponse);
        }
        start = stdoutBuf.indexOf('{');
      } else {
        // Need more data
        break;
      }
    }
  };

  proc.stdout.on('data', (chunk) => {
    stdoutBuf += String(chunk || '');
    // Cap buffer size to avoid runaway memory if server spams output.
    if (stdoutBuf.length > 200_000) {
      stdoutBuf = stdoutBuf.slice(-200_000);
    }
    tryConsumeBuffer();
  });

  proc.on('exit', () => {
    // Fail all pending
    for (const [id, p] of pending.entries()) {
      clearTimeout(p.timeout);
      p.reject(new Error(`MCP stdio process exited (${serverId})`));
      pending.delete(id);
    }

    processes.delete(serverId);
  });

  const state: ProcState = { proc, pending, initialized: false, stderrTail: [] };

  // Don't log secrets; but stderr can contain useful errors.
  proc.stderr.on('data', (chunk) => {
    pushStderr(state, chunk);
  });

  proc.stdin.on('error', (err) => {
    pushStderr(state, `stdin error: ${err instanceof Error ? err.message : String(err)}`);
  });
  processes.set(serverId, state);
  return state;
}

function getOrStart(serverId: StdioMcpServerId): ProcState {
  return processes.get(serverId) || startProcess(serverId);
}

function safeWrite(state: ProcState, payload: unknown) {
  try {
    if (state.proc.killed) throw new Error('MCP stdio process is not running');
    state.proc.stdin.write(JSON.stringify(payload) + '\n');
  } catch (e: any) {
    pushStderr(state, e?.message || String(e));
    throw e;
  }
}

function sendNotification(serverId: StdioMcpServerId, method: string, params?: unknown) {
  const state = getOrStart(serverId);
  const payload: JsonRpcNotification = { jsonrpc: '2.0', method, params };
  safeWrite(state, payload);
}

async function rpc<TResult>(serverId: StdioMcpServerId, method: string, params?: unknown, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<TResult> {
  const state = getOrStart(serverId);

  const id = makeId();
  const payload: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

  const promise = new Promise<TResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      state.pending.delete(id);
      reject(new Error(`MCP stdio RPC timeout: ${method}`));
    }, timeoutMs);

    state.pending.set(id, { resolve, reject, timeout });

    try {
      safeWrite(state, payload);
    } catch (e) {
      clearTimeout(timeout);
      state.pending.delete(id);
      reject(e);
    }
  });

  return promise;
}

async function ensureInitialized(serverId: StdioMcpServerId) {
  const state = getOrStart(serverId);
  if (state.initialized) return;

  await rpc(serverId, 'initialize', {
    protocolVersion: '2024-11-05',
    clientInfo: { name: 'gumgenie-pro-ai', version: '0.0.0' },
    capabilities: {},
  }, INIT_TIMEOUT_MS);

  // MCP handshake requires a follow-up notification.
  sendNotification(serverId, 'initialized');

  state.initialized = true;
}

export async function stdioListTools(serverId: StdioMcpServerId): Promise<McpToolsListResult> {
  await ensureInitialized(serverId);
  try {
    return await rpc<McpToolsListResult>(serverId, 'tools/list');
  } catch (e: any) {
    const state = processes.get(serverId);
    const stderrTail = state?.stderrTail?.join('\n');

    // Notion remote MCP (via mcp-remote) can get into a bad session state after auth.
    // If init is rejected due to sessionId, restart the process and surface the error clearly.
    if (serverId === 'gumgenie' && stderrTail && /Initialization requests must not include a sessionId/i.test(stderrTail)) {
      stdioStop(serverId);
    }

    const msg = stderrTail ? `${e?.message || e}\n\n[stderrTail]\n${stderrTail}` : (e?.message || String(e));
    throw new Error(msg);
  }
}

export async function stdioCallTool(
  serverId: StdioMcpServerId,
  toolName: string,
  args: unknown,
  timeoutMs?: number
): Promise<McpCallToolResult> {
  try {
    await ensureInitialized(serverId);
    return await rpc<McpCallToolResult>(
      serverId,
      'tools/call',
      {
        name: toolName,
        arguments: args,
      },
      timeoutMs
    );
  } catch (e: any) {
    const state = processes.get(serverId);
    const stderrTail = state?.stderrTail?.join('\n');

    if (serverId === 'gumgenie' && stderrTail && /Initialization requests must not include a sessionId/i.test(stderrTail)) {
      stdioStop(serverId);
    }

    const msg = stderrTail ? `${e?.message || e}\n\n[stderrTail]\n${stderrTail}` : (e?.message || String(e));
    throw new Error(msg);
  }
}

export function stdioStop(serverId: StdioMcpServerId) {
  const state = processes.get(serverId);
  if (!state) return;
  try {
    state.proc.kill();
  } catch {
    // ignore kill errors
  }
  processes.delete(serverId);
}
