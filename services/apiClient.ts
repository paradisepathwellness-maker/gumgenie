import { AiFormatResult, ContentBlock, TemplateCategory, Product, StylePreset } from '../types';

function resolveApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envUrl) return envUrl;

  // In dev, the frontend and backend run on the same host but different ports.
  // This is important for Docker-based browser automation which accesses the UI via
  // `host.docker.internal:3110` (so backend must be `host.docker.internal:4000`).
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:4000`;
  }

  return 'http://localhost:4000';
}

const API_BASE_URL: string = resolveApiBaseUrl();

async function parseError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const json = JSON.parse(text);
    return json?.error ? String(json.error) : text;
  } catch {
    return text;
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function generateProduct(category: TemplateCategory): Promise<{ product: Product; presets: StylePreset[] }> {
  const res = await fetch(`${API_BASE_URL}/api/generate-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`Generation failed (${res.status}): ${err}`);
  }

  return res.json();
}

// V2.3 Agent Squad
export async function agentsGenerate(category: TemplateCategory): Promise<{ product: Product; preset: StylePreset; meta?: unknown }> {
  const res = await fetch(`${API_BASE_URL}/api/agents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`Agent generation failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function agentsResearch(category: TemplateCategory, opts?: { force?: boolean }): Promise<{ status: string; snapshotPath: string; snapshot: unknown }> {
  const res = await fetch(`${API_BASE_URL}/api/agents/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, force: !!opts?.force }),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`Agent research failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function gumroadStatus(): Promise<{ connected: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/gumroad/status`, { method: 'GET' });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`Gumroad status failed (${res.status}): ${err}`);
  }
  return res.json();
}

export function gumroadConnectUrl(): string {
  return `${API_BASE_URL}/api/gumroad/oauth/start`;
}

export async function gumroadPublish(input: { name: string; price: number; description?: string }): Promise<{ success: true; id: string; url: string }> {
  const res = await fetch(`${API_BASE_URL}/api/gumroad/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`Publish failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function marketBrief(input: { query: string; category?: TemplateCategory }) {
  const res = await fetch(`${API_BASE_URL}/api/market-brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`Market brief failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function mcpListTools(input: { serverUrl: string }): Promise<{ tools: { name: string; description?: string }[] }> {
  const res = await fetch(`${API_BASE_URL}/api/mcp/tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`MCP tools failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function mcpGenerateBlock(input: {
  serverUrl: string;
  toolName: string;
  prompt: string;
  blockType?: ContentBlock['type'];
}): Promise<{ block: Omit<ContentBlock, 'id'>; raw: unknown }> {
  const res = await fetch(`${API_BASE_URL}/api/mcp/generate-block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`MCP generate failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function aiFormatBlockServer(input: {
  product: Product;
  preset: StylePreset;
  block: Omit<ContentBlock, 'id'>;
}): Promise<AiFormatResult> {
  const res = await fetch(`${API_BASE_URL}/api/ai/format-block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`AI format failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function aiFormatMcpOutputServer(input: {
  text: string;
  targetBlockType: ContentBlock['type'];
  product: Product;
  preset: StylePreset;
}): Promise<AiFormatResult> {
  const res = await fetch(`${API_BASE_URL}/api/ai/format-mcp-output`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`AI MCP format failed (${res.status}): ${err}`);
  }

  return res.json();
}

// MCP stdio (local)
export async function mcpStdioServers(): Promise<{ servers: { id: string; label: string }[] }> {
  const res = await fetch(`${API_BASE_URL}/api/mcp-stdio/servers`, { method: 'GET' });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`MCP stdio servers failed (${res.status}): ${err}`);
  }
  return res.json();
}

export async function mcpSseServers(): Promise<{ servers: { id: string; label: string }[] }> {
  const res = await fetch(`${API_BASE_URL}/api/mcp-sse/servers`, { method: 'GET' });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`MCP sse servers failed (${res.status}): ${err}`);
  }
  return res.json();
}

export async function mcpStdioListTools(input: { serverId: string }): Promise<{ tools: { name: string; description?: string }[] }> {
  const res = await fetch(`${API_BASE_URL}/api/mcp-stdio/tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`MCP stdio tools failed (${res.status}): ${err}`);
  }
  return res.json();
}

export async function mcpStdioCall(input: { serverId: string; toolName: string; args?: unknown; timeoutMs?: number }): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/mcp-stdio/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`MCP stdio call failed (${res.status}): ${err}`);
  }
  return res.json();
}

// MCP SSE (hosted)

export async function mcpSseListTools(input: { serverId: string }): Promise<{ tools: { name: string; description?: string }[] }> {
  const res = await fetch(`${API_BASE_URL}/api/mcp-sse/tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`MCP sse tools failed (${res.status}): ${err}`);
  }
  return res.json();
}

export async function mcpSseCall(input: { serverId: string; toolName: string; args?: unknown }): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/mcp-sse/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(`MCP sse call failed (${res.status}): ${err}`);
  }
  return res.json();
}
