import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs/promises';
import { generateProductFromGemini } from './gemini';
import { TemplateCategory } from '../types';
import { fetchMarketBrief } from './marketSignals';
import { createGumroadProduct, exchangeCodeForToken, getGumroadAuthUrl, isConnectedToGumroad } from './gumroad';
import { exchangeCodeForToken as exchangeNotionCodeForToken, getNotionAuthUrl, isConnectedToNotion } from './notion';
import { listTools, callTool } from './mcpClient';
import { formatBlockServer } from './aiFormatter';
import { formatMcpOutput } from './formatMcpOutput';
import { ContentBlock, StylePreset, Product } from '../types';
import { processChatSuggestion, generateChatComponent } from './chatProcessing';
import { recommendTool, extractMcpText, type ChatOrchestrateMode } from './chatOrchestrate';
import { TraceLogger, createTraceId, isTraceEnabled } from './trace';
import { getStdioMcpServers, type StdioMcpServerId } from './mcpStdioServers';
import { getStdioServerDiagnostics, stdioCallTool, stdioListTools } from './mcpStdioClient';
import { getSseMcpServers, type SseMcpServerId } from './mcpSseServers';
import { getHttpMcpServers, getHttpMcpServer, type HttpMcpServerId } from './mcpHttpServers';
import { httpCallTool, httpListTools } from './mcpHttpClient';
import { getNotionToken } from './notion';
import { callNotionMcpTool, listNotionMcpToolsCached } from './notionMcp';
import { sseCallTool, sseListTools } from './mcpSseClient';
import { agentRoutes } from './agents/routes/agentRoutes';
import dotenv from 'dotenv';

// Load environment variables at the start of the server.
// Prefer root .env.local (dev) then fall back to .env.
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3110';

type CachedJson = { value: any | null; loaded: boolean };
const jsonCache: Record<string, CachedJson> = {};

async function readJsonCached(filePath: string): Promise<any | null> {
  const full = path.resolve(filePath);
  const cached = jsonCache[full];
  if (cached?.loaded) return cached.value;

  try {
    const txt = await fs.readFile(full, 'utf8');
    const value = JSON.parse(txt);
    jsonCache[full] = { value, loaded: true };
    return value;
  } catch {
    jsonCache[full] = { value: null, loaded: true };
    return null;
  }
}

app.get('/api/health', (req, res) => {
  return res.status(200).json({ status: 'ok', now: new Date().toISOString() });
});

app.get('/api/version', async (req, res) => {
  const [pkg, meta] = await Promise.all([readJsonCached('package.json'), readJsonCached('metadata.json')]);
  const name = (meta && meta.name) || (pkg && pkg.name) || 'gumgenie-pro-ai';
  const version = (meta && meta.version) || (pkg && pkg.version) || 'unknown';
  return res.status(200).json({ name, version });
});

app.use(
  cors({
    // DEV MODE: Allow local and LAN origins for rapid iteration.
    // We allow any http(s) origin running on port 3110 (Vite dev server).
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // curl / server-to-server

      try {
        const u = new URL(origin);
        const allowedDevPort = 3110;
        const port = u.port ? Number(u.port) : (u.protocol === 'https:' ? 443 : 80);

        if (port === allowedDevPort) return callback(null, true);

        // Also allow exact FRONTEND_URL if explicitly configured.
        if (origin === FRONTEND_URL) return callback(null, true);

        return callback(new Error(`CORS blocked origin: ${origin}`));
      } catch {
        return callback(new Error(`CORS invalid origin: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// V2.3 Agent Squad routes
app.use('/api/agents', agentRoutes);

/**
 * AI Generation (server-side Gemini)
 */
app.post('/api/generate-product', async (req, res) => {
  const { category } = req.body as { category?: TemplateCategory };

  if (!category) {
    return res.status(400).json({ error: 'Missing required field: category' });
  }

  try {
    const raw = await generateProductFromGemini(category);

    const images: Record<TemplateCategory, string> = {
      [TemplateCategory.AI_PROMPTS]: 'https://picsum.photos/seed/prompt/1200/800',
      [TemplateCategory.NOTION_TEMPLATES]: 'https://picsum.photos/seed/notion/1200/800',
      [TemplateCategory.DIGITAL_PLANNERS]: 'https://picsum.photos/seed/planner/1200/800',
      [TemplateCategory.DESIGN_TEMPLATES]: 'https://picsum.photos/seed/design/1200/800',
    };

    return res.status(200).json({
      product: {
        ...raw.product,
        category,
        coverImage: images[category],
        contentBlocks: [],
      },
      presets: raw.presets,
    });
  } catch (error: unknown) {
    console.error(error);

    const msg = error instanceof Error ? error.message : 'Generation failed';
    const hint = msg.includes('GEMINI_API_KEY')
      ? 'Backend is missing GEMINI_API_KEY. On Windows PowerShell: $env:GEMINI_API_KEY="..." then restart backend.'
      : undefined;

    return res.status(500).json({ error: msg, hint });
  }
});

/**
 * Simulation endpoint (in-memory mock)
 * NOTE: Prisma is not configured in this repo yet.
 */
app.post('/api/simulate-generation', async (req, res) => {
  const { categoryId } = req.body as { categoryId?: string };

  // Mimic async work
  await new Promise((r) => setTimeout(r, 150));

  res.status(202).json({
    status: 'Architecting',
    jobId: 'sim_' + Math.random().toString(36).substr(2, 9),
    initialLogs: [
      {
        id: 'log_' + Math.random().toString(36).substr(2, 9),
        phase: 'INITIALIZING',
        message: `Synthesis request received at architect node${categoryId ? ` (categoryId=${categoryId})` : ''}.`,
        type: 'info',
      },
    ],
  });
});

/**
 * Market signals (MVP)
 */
app.post('/api/market-brief', async (req, res) => {
  const { query, category } = req.body as { query?: string; category?: TemplateCategory };
  if (!query) return res.status(400).json({ error: 'Missing required field: query' });

  try {
    const brief = await fetchMarketBrief({ query, category });
    return res.status(200).json(brief);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Market brief failed' });
  }
});

/**
 * Gumroad OAuth
 */
app.get('/api/gumroad/oauth/start', (req, res) => {
  try {
    const url = getGumroadAuthUrl();
    return res.redirect(url);
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Missing Gumroad OAuth env vars' });
  }
});

app.get('/api/gumroad/oauth/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  if (!code) return res.status(400).send('Missing code');

  try {
    await exchangeCodeForToken(code);
    return res.redirect(`${FRONTEND_URL}?gumroad=connected`);
  } catch (e: unknown) {
    console.error(e);
    return res.redirect(`${FRONTEND_URL}?gumroad=error&message=${encodeURIComponent(e instanceof Error ? e.message : 'oauth_failed')}`);
  }
});

app.get('/api/gumroad/status', (req, res) => {
  return res.status(200).json({ connected: isConnectedToGumroad() });
});

// ------------------------------
// Notion OAuth (for Notion MCP)
// ------------------------------
app.get('/api/notion/oauth/start', (req, res) => {
  const stateRaw = typeof req.query.state === 'string' ? req.query.state : '';
  const debug = req.query.debug === '1' || req.query.debug === 'true';
  // Use OAuth state roundtrip to enable debug mode in callback.
  const state = [stateRaw, debug ? 'debug' : ''].filter(Boolean).join('|') || undefined;

  try {
    const url = getNotionAuthUrl(state);
    return res.redirect(url);
  } catch (e: unknown) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'notion_oauth_start_failed' });
  }
});

app.get('/api/notion/oauth/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const debug = process.env.NODE_ENV !== 'production' && state.split('|').includes('debug');

  if (!code) {
    if (debug) return res.status(400).json({ ok: false, connected: isConnectedToNotion(), error: 'Missing code' });
    return res.status(400).send('Missing code');
  }

  try {
    await exchangeNotionCodeForToken(code);
    if (debug) return res.status(200).json({ ok: true, connected: isConnectedToNotion() });
    return res.redirect(`${FRONTEND_URL}?notion=connected`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'oauth_failed';
    const safe = String(msg).slice(0, 500);
    if (debug) return res.status(400).json({ ok: false, connected: isConnectedToNotion(), error: safe });
    return res.redirect(`${FRONTEND_URL}?notion=error&message=${encodeURIComponent(safe)}`);
  }
});

app.get('/api/notion/status', (req, res) => {
  return res.status(200).json({ connected: isConnectedToNotion() });
});

// Build a deterministic Notion template structure via MCP (dev-only)
if (process.env.NODE_ENV !== 'production') {
  // Lazy import to avoid loading Notion build runner unless used.
  app.post('/api/notion/build-template', async (req, res) => {
    try {
      const { buildNotionTemplateFromBlueprint } = await import('./agents/runners/notionBuildRunner');
      const result = await buildNotionTemplateFromBlueprint();
      return res.status(200).json(result);
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to build template' });
    }
  });
}

// Dev-only Notion MCP introspection helpers (speed up build runner work)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/notion/mcp/tools', async (req, res) => {
    try {
      const tools = await listNotionMcpToolsCached({ force: req.query.force === 'true' });
      return res.status(200).json(tools);
    } catch (e: unknown) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to list Notion MCP tools' });
    }
  });

  app.post('/api/notion/mcp/call', async (req, res) => {
    const { toolName, args, timeoutMs } = req.body as { toolName?: string; args?: unknown; timeoutMs?: number };
    if (!toolName) return res.status(400).json({ error: 'Missing required field: toolName' });

    try {
      const result = await callNotionMcpTool({ toolName, args: args || {}, timeoutMs });
      return res.status(200).json(result);
    } catch (e: unknown) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to call Notion MCP tool' });
    }
  });
}

/**
 * Gumroad product creation
 */
app.post('/api/gumroad/products', async (req, res) => {
  const { name, price, description } = req.body as { name?: string; price?: number; description?: string };
  if (!name) return res.status(400).json({ error: 'Missing required field: name' });
  if (typeof price !== 'number' || Number.isNaN(price)) return res.status(400).json({ error: 'Missing/invalid field: price' });

  try {
    const result = await createGumroadProduct({ name, price, description });
    return res.status(200).json({ success: true, ...result });
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Publish failed' });
  }
});

/**
 * MCP: list tools
 */
app.post('/api/mcp/tools', async (req, res) => {
  const { serverUrl } = req.body as { serverUrl?: string };
  if (!serverUrl) return res.status(400).json({ error: 'Missing required field: serverUrl' });

  try {
    const tools = await listTools(serverUrl);
    return res.status(200).json(tools);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to list MCP tools' });
  }
});

/**
 * MCP: generate block
 */
app.post('/api/mcp/generate-block', async (req, res) => {
  const { serverUrl, toolName, prompt, blockType } = req.body as {
    serverUrl?: string;
    toolName?: string;
    prompt?: string;
    blockType?: ContentBlock['type'];
  };

  if (!serverUrl) return res.status(400).json({ error: 'Missing required field: serverUrl' });
  if (!toolName) return res.status(400).json({ error: 'Missing required field: toolName' });
  if (!prompt) return res.status(400).json({ error: 'Missing required field: prompt' });

  try {
    const result = await callTool(serverUrl, toolName, { prompt, blockType });

    const text = (result.content || [])
      .filter((p) => (p as { type: string }).type === 'text')
      .map((p) => (p as { text: string }).text)
      .join('\n')
      .trim();

    // Best-effort mapping: treat result as a text block unless caller specified.
    const block: Omit<ContentBlock, 'id'> = {
      type: blockType || 'text',
      title: blockType && blockType !== 'text' ? 'Generated Section' : undefined,
      content: text || 'Generated content (empty response).',
    };

    return res.status(200).json({ block, raw: result });
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'MCP generate failed' });
  }
});

/**
 * AI formatter (server-side)
 */
app.post('/api/ai/format-block', async (req, res) => {
  const { product, preset, block } = req.body as {
    product?: Product;
    preset?: StylePreset;
    block?: Omit<ContentBlock, 'id'>;
  };

  if (!product) return res.status(400).json({ error: 'Missing required field: product' });
  if (!preset) return res.status(400).json({ error: 'Missing required field: preset' });
  if (!block) return res.status(400).json({ error: 'Missing required field: block' });

  try {
    const result = await formatBlockServer({ product, preset, block });
    return res.status(200).json(result);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'AI format failed' });
  }
});

app.post('/api/ai/format-mcp-output', async (req, res) => {
  const { text, targetBlockType, product, preset } = req.body as {
    text?: string;
    targetBlockType?: ContentBlock['type'];
    product?: Product;
    preset?: StylePreset;
  };

  if (!text) return res.status(400).json({ error: 'Missing required field: text' });
  if (!targetBlockType) return res.status(400).json({ error: 'Missing required field: targetBlockType' });
  if (!product) return res.status(400).json({ error: 'Missing required field: product' });
  if (!preset) return res.status(400).json({ error: 'Missing required field: preset' });

  try {
    const result = await formatMcpOutput({ text, targetBlockType, product, preset });
    return res.status(200).json(result);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'AI MCP format failed' });
  }
});

/**
 * MCP stdio (local): list available servers
 */
app.get('/api/mcp-stdio/servers', (req, res) => {
  const servers = getStdioMcpServers().map((s) => ({ id: s.id, label: s.label }));
  return res.status(200).json({ servers });
});

/**
 * MCP stdio (local): list tools
 */
app.post('/api/mcp-stdio/tools', async (req, res) => {
  const { serverId } = req.body as { serverId?: StdioMcpServerId };
  if (!serverId) return res.status(400).json({ error: 'Missing required field: serverId' });

  try {
    const result = await stdioListTools(serverId);
    return res.status(200).json(result);
  } catch (e: unknown) {
    console.error(e);
    const diag = getStdioServerDiagnostics(serverId);
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Failed to list stdio MCP tools',
      diagnostics: {
        initialized: diag.initialized,
        stderrTail: diag.stderrTail.slice(-12),
      },
    });
  }
});

/**
 * MCP stdio (local): call tool
 */
app.post('/api/mcp-stdio/call', async (req, res) => {
  const { serverId, toolName, args, timeoutMs } = req.body as {
    serverId?: StdioMcpServerId;
    toolName?: string;
    args?: unknown;
    timeoutMs?: number;
  };
  if (!serverId) return res.status(400).json({ error: 'Missing required field: serverId' });
  if (!toolName) return res.status(400).json({ error: 'Missing required field: toolName' });

  try {
    const result = await stdioCallTool(serverId, toolName, args || {}, timeoutMs);
    return res.status(200).json(result);
  } catch (e: unknown) {
    console.error(e);
    const diag = getStdioServerDiagnostics(serverId);
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Failed to call stdio MCP tool',
      diagnostics: {
        initialized: diag.initialized,
        stderrTail: diag.stderrTail.slice(-12),
      },
    });
  }
});

/**
 * MCP SSE (hosted): list servers
 */
app.get('/api/mcp-sse/servers', (req, res) => {
  const servers = getSseMcpServers().map((s) => ({ id: s.id, label: s.label }));
  return res.status(200).json({ servers });
});

/**
 * MCP SSE (hosted): list tools
 */
app.post('/api/mcp-sse/tools', async (req, res) => {
  const { serverId } = req.body as { serverId?: SseMcpServerId };
  if (!serverId) return res.status(400).json({ error: 'Missing required field: serverId' });

  try {
    const result = await sseListTools(serverId);
    return res.status(200).json(result);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to list SSE MCP tools' });
  }
});

/**
 * MCP SSE (hosted): call tool
 */
app.post('/api/mcp-sse/call', async (req, res) => {
  const { serverId, toolName, args } = req.body as { serverId?: SseMcpServerId; toolName?: string; args?: unknown };
  if (!serverId) return res.status(400).json({ error: 'Missing required field: serverId' });
  if (!toolName) return res.status(400).json({ error: 'Missing required field: toolName' });

  try {
    const result = await sseCallTool(serverId, toolName, args || {});
    return res.status(200).json(result);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to call SSE MCP tool' });
  }
});

/**
 * MCP HTTP adapter: Gemini Image (local REST -> MCP JSON-RPC)
 *
 * This endpoint speaks MCP-over-HTTP JSON-RPC so it can be used with the existing
 * `httpListTools` / `httpCallTool` helpers (initialize + tools/list + tools/call).
 *
 * Safety: never return base64 image payloads; return only ids/urls/metadata.
 */
app.post('/api/mcp-http-adapter/gemini-image', express.json({ limit: '1mb' }), async (req, res) => {
  const baseUrl = (process.env.GEMINI_IMAGE_MCP_BASE_URL || 'http://localhost:3102').replace(/\/+$/, '');

  const rpc = req.body as {
    jsonrpc?: '2.0';
    id?: string | number;
    method?: string;
    params?: any;
  };

  const jsonrpc = '2.0' as const;
  const id = rpc?.id ?? null;

  const respond = (result: unknown) => res.status(200).json({ jsonrpc, id, result });
  const error = (code: number, message: string, data?: unknown) => res.status(200).json({ jsonrpc, id, error: { code, message, data } });

  try {
    const method = String(rpc?.method || '');

    if (method === 'initialize') {
      // Best-effort: some clients require this but don't rely on specific fields.
      return respond({
        serverInfo: { name: 'gemini-image-adapter', version: '1.0.0' },
        capabilities: {},
      });
    }

    if (method === 'tools/list') {
      return respond({
        tools: [
          {
            name: 'gemini_image.list_models',
            description: 'List available Gemini image model identifiers (proxied from gemini-image-mcp).',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          },
          {
            name: 'gemini_image.generate',
            description: 'Generate an image from a prompt. Returns only image id + URLs (no base64).',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
                width: { type: 'number' },
                height: { type: 'number' },
                aspect_ratio: { type: 'string' },
                resolution: { type: 'string' },
                model: { type: 'string' },
              },
              required: ['prompt'],
              additionalProperties: true,
            },
          },
          {
            name: 'gemini_image.list_images',
            description: 'List generated images metadata (id, url, download_url).',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          },
        ],
      });
    }

    if (method === 'tools/call') {
      const name = String(rpc?.params?.name || '');
      const args = (rpc?.params?.arguments || {}) as any;

      const safeText = (obj: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });

      if (name === 'gemini_image.list_models') {
        const r = await fetch(`${baseUrl}/models`, { method: 'GET' });
        const text = await r.text().catch(() => '');
        if (!r.ok) return error(-32000, `gemini-image-mcp /models failed (${r.status})`, text.slice(0, 500));
        const json = JSON.parse(text);
        return respond(safeText(json));
      }

      if (name === 'gemini_image.list_images') {
        const r = await fetch(`${baseUrl}/images`, { method: 'GET' });
        const text = await r.text().catch(() => '');
        if (!r.ok) return error(-32000, `gemini-image-mcp /images failed (${r.status})`, text.slice(0, 500));
        const json = JSON.parse(text);
        return respond(safeText(json));
      }

      if (name === 'gemini_image.generate') {
        const payload: any = {
          prompt: String(args?.prompt || ''),
        };
        // Best-effort optional params (server supports width/height; ignore unknowns)
        if (typeof args?.width === 'number') payload.width = args.width;
        if (typeof args?.height === 'number') payload.height = args.height;
        if (typeof args?.aspect_ratio === 'string') payload.aspect_ratio = args.aspect_ratio;
        if (typeof args?.resolution === 'string') payload.resolution = args.resolution;
        if (typeof args?.model === 'string') payload.model = args.model;

        const r = await fetch(`${baseUrl}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const text = await r.text().catch(() => '');
        if (!r.ok) return error(-32000, `gemini-image-mcp /generate failed (${r.status})`, text.slice(0, 500));

        let json: any;
        try {
          json = JSON.parse(text);
        } catch {
          json = { raw: text };
        }

        // Strip any base64/data blobs from the response before returning.
        const safe: any = {
          id: json?.id ?? null,
          url: json?.url ?? null,
          download_url: json?.download_url ?? null,
          // Some servers may return these fields in an array.
          images: Array.isArray(json?.images)
            ? json.images.map((img: any) => ({
                id: img?.id ?? null,
                url: img?.url ?? null,
                download_url: img?.download_url ?? null,
              }))
            : undefined,
        };

        return respond(safeText({ ok: true, generated: safe }));
      }

      return error(-32601, `Unknown tool: ${name}`);
    }

    return error(-32601, `Unknown method: ${method}`);
  } catch (e: unknown) {
    return error(-32000, e instanceof Error ? e.message : 'Gemini image adapter error');
  }
});

/**
 * MCP HTTP (remote): list servers
 */
app.get('/api/mcp-http/servers', (req, res) => {
  const servers = getHttpMcpServers().map((s) => ({ id: s.id, label: s.label }));
  return res.status(200).json({ servers });
});

/**
 * MCP HTTP (remote): list tools
 */
app.post('/api/mcp-http/tools', async (req, res) => {
  const { serverId } = req.body as { serverId?: HttpMcpServerId };
  if (!serverId) return res.status(400).json({ error: 'Missing required field: serverId' });

  try {
    const server = getHttpMcpServer(serverId);

    const headers: Record<string, string> = {};
    if (serverId === 'notion') {
      const token = getNotionToken();
      if (!token) return res.status(401).json({ error: 'Not connected to Notion. Complete OAuth at /api/notion/oauth/start' });
      headers.Authorization = `Bearer ${token}`;
    }

    const result = await httpListTools({ url: server.url, headers });
    return res.status(200).json(result);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to list HTTP MCP tools' });
  }
});

/**
 * MCP HTTP (remote): call tool
 */
app.post('/api/mcp-http/call', async (req, res) => {
  const { serverId, toolName, args, timeoutMs } = req.body as {
    serverId?: HttpMcpServerId;
    toolName?: string;
    args?: unknown;
    timeoutMs?: number;
  };
  if (!serverId) return res.status(400).json({ error: 'Missing required field: serverId' });
  if (!toolName) return res.status(400).json({ error: 'Missing required field: toolName' });

  try {
    const server = getHttpMcpServer(serverId);

    const headers: Record<string, string> = {};
    if (serverId === 'notion') {
      const token = getNotionToken();
      if (!token) return res.status(401).json({ error: 'Not connected to Notion. Complete OAuth at /api/notion/oauth/start' });
      headers.Authorization = `Bearer ${token}`;
    }

    const result = await httpCallTool({ url: server.url, toolName, args: args || {}, headers, timeoutMs });
    return res.status(200).json(result);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to call HTTP MCP tool' });
  }
});

// Chat with AI endpoints

// In-memory tool catalog cache for orchestration (performance)
const toolCatalogCache: {
  fetchedAt: number;
  servers: { id: StdioMcpServerId; label: string }[];
  toolsByServerId: Record<string, any>;
} = {
  fetchedAt: 0,
  servers: [],
  toolsByServerId: {},
};

async function getToolCatalogCached(opts?: { force?: boolean }) {
  const force = Boolean(opts?.force);
  const now = Date.now();
  const ttlMs = 5 * 60 * 1000;
  if (!force && toolCatalogCache.servers.length && now - toolCatalogCache.fetchedAt < ttlMs) {
    return toolCatalogCache;
  }

  const servers = getStdioMcpServers().map((s) => ({ id: s.id, label: s.label }));
  const toolsByServerId: Record<string, any> = {};

  // Best-effort: list tools for each server; keep failures isolated.
  for (const s of servers) {
    try {
      // eslint-disable-next-line no-await-in-loop
      toolsByServerId[s.id] = await stdioListTools(s.id);
    } catch (e) {
      toolsByServerId[s.id] = { tools: [], error: e instanceof Error ? e.message : String(e) };
    }
  }

  toolCatalogCache.fetchedAt = now;
  toolCatalogCache.servers = servers;
  toolCatalogCache.toolsByServerId = toolsByServerId;

  return toolCatalogCache;
}

app.post('/api/chat/orchestrate', async (req, res) => {
  const traceId = createTraceId();
  const trace = new TraceLogger(traceId);
  trace.add('request.received', { body: req.body });

  const { message, context, mode, product, preset } = req.body as {
    message?: string;
    mode?: ChatOrchestrateMode;
    context?: { category?: string; contentArea?: string; currentContent?: string };
    product?: Product;
    preset?: StylePreset;
  };

  if (!message) {
    trace.add('request.invalid', { error: 'Missing required field: message' });
    await trace.flush();
    return res.status(400).json({ error: 'Missing required field: message', meta: isTraceEnabled() ? { traceId } : undefined });
  }
  const resolvedMode: ChatOrchestrateMode = mode === 'turbo' ? 'turbo' : 'ask';

  try {
    const t0 = Date.now();
    const catalog = await getToolCatalogCached();
    trace.add('catalog.loaded', { ms: Date.now() - t0, serverCount: catalog.servers.length });

    const t1 = Date.now();
    const recommendation = await recommendTool({
      message,
      mode: resolvedMode,
      context,
      product,
      preset,
      toolCatalog: {
        // cast is ok: ids are known stdio server ids
        servers: catalog.servers as any,
        toolsByServerId: catalog.toolsByServerId,
      },
    });

    trace.add('recommendation.ready', { ms: Date.now() - t1, recommendation });

    if (resolvedMode === 'ask') {
      await trace.flush();
      return res.status(200).json({
        executed: false,
        recommendation,
        meta: isTraceEnabled() ? { traceId } : undefined,
      });
    }

    // Turbo requires product+preset so we can format output reliably.
    if (!product) {
      trace.add('request.invalid', { error: 'Missing required field: product (required for Turbo formatting)' });
      await trace.flush();
      return res.status(400).json({ error: 'Missing required field: product (required for Turbo formatting)', meta: isTraceEnabled() ? { traceId } : undefined });
    }
    if (!preset) {
      trace.add('request.invalid', { error: 'Missing required field: preset (required for Turbo formatting)' });
      await trace.flush();
      return res.status(400).json({ error: 'Missing required field: preset (required for Turbo formatting)', meta: isTraceEnabled() ? { traceId } : undefined });
    }

    const t2 = Date.now();
    const mcpRaw = await stdioCallTool(recommendation.serverId, recommendation.toolName, recommendation.args || {}, 25_000);
    const mcpText = extractMcpText(mcpRaw);
    trace.add('mcp.executed', { ms: Date.now() - t2, serverId: recommendation.serverId, toolName: recommendation.toolName });

    let formatted;
    const t3 = Date.now();
    try {
      formatted = await formatMcpOutput({
        text: mcpText || 'Empty MCP output.',
        targetBlockType: recommendation.targetBlockType,
        product,
        preset,
      });
      trace.add('format.success', { ms: Date.now() - t3, usedFallback: Boolean((formatted as any)?.usedFallback) });
    } catch (err) {
      trace.add('format.failure', { ms: Date.now() - t3, error: err instanceof Error ? err.message : String(err) });
      // Never dead-end: return safe fallback block if formatting fails/timeouts.
      const fallbackBlock = createFallbackComponentForAPI(
        recommendation.targetBlockType === 'pricing' ? '3-Tier Pricing' : 'Feature Grid',
        { category: context?.category }
      );
      formatted = {
        formattedBlock: {
          ...fallbackBlock,
          type: recommendation.targetBlockType === 'pricing' ? 'pricing' : 'feature-grid',
        },
        suggestions: getCategoryFallbackSuggestions(context?.category || 'general').map((s) => ({
          title: 'Next step',
          reason: 'Fallback used due to formatting failure',
          impact: 'medium',
          action: s,
        })),
        usedFallback: true,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    trace.add('response.ok', { executed: true, recommendation, formattedMeta: { usedFallback: Boolean((formatted as any)?.usedFallback) } });
    await trace.flush();
    return res.status(200).json({
      executed: true,
      recommendation,
      mcpText,
      formatted,
      meta: isTraceEnabled() ? { traceId } : undefined,
    });
  } catch (e: unknown) {
    trace.add('response.error', { error: e instanceof Error ? e.message : String(e) });
    await trace.flush();
    console.error(e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Chat orchestration failed',
      meta: isTraceEnabled() ? { traceId } : undefined,
    });
  }
});

// Dev-only: fetch trace file
app.get('/api/traces/:traceId', async (req, res) => {
  if (String(process.env.AGENT_TRACE_ENABLED || '').toLowerCase() !== 'true') {
    return res.status(404).json({ error: 'Tracing disabled' });
  }
  const { traceId } = req.params;
  const path = await import('node:path');
  const fs = await import('node:fs/promises');
  const filePath = path.join('production-test', 'logs', `${traceId}.json`);
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    res.type('application/json').send(txt);
  } catch {
    res.status(404).json({ error: 'Trace not found' });
  }
});

app.post('/api/chat/process-suggestion', async (req, res) => {
  const { suggestion, context, phase } = req.body;
  
  try {
    const response = await processChatSuggestion({
      suggestion,
      context,
      phase: phase || 'suggestions'
    });
    
    res.json(response);
  } catch (error) {
    console.error('Chat suggestion processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat suggestion',
      fallback: {
        type: 'suggestions',
        content: 'I apologize, but I encountered an issue processing your request. Please try again.',
        suggestions: context?.category ? getCategoryFallbackSuggestions(context.category) : []
      }
    });
  }
});

app.post('/api/chat/generate-component', async (req, res) => {
  const { implementation, context } = req.body;
  
  try {
    const component = await generateChatComponent({
      implementation,
      context
    });
    
    res.json({
      success: true,
      component
    });
  } catch (error) {
    console.error('Chat component generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate component',
      component: createFallbackComponentForAPI(implementation, context)
    });
  }
});

// Helper function for fallback suggestions
function getCategoryFallbackSuggestions(category: string): string[] {
  const fallbacks = {
    'AI_PROMPTS': [
      "Create framework showcase",
      "Build technical credibility",
      "Generate testimonials",
      "Design pricing structure"
    ],
    'NOTION_TEMPLATES': [
      "Showcase database capabilities",
      "Highlight productivity benefits",
      "Create setup guide",
      "Generate testimonials"
    ],
    'DIGITAL_PLANNERS': [
      "Create aesthetic gallery",
      "Build lifestyle benefits",
      "Show app compatibility",
      "Generate community section"
    ],
    'DESIGN_TEMPLATES': [
      "Build ROI calculator",
      "Show platform compatibility", 
      "Generate case studies",
      "Create license guide"
    ]
  };
  
  return fallbacks[category as keyof typeof fallbacks] || [
    "Create interactive component",
    "Build informational section",
    "Generate comparison table",
    "Design visual showcase"
  ];
}

// Helper function for API fallback component
function createFallbackComponentForAPI(implementation: string, context?: any) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    type: 'feature-grid',
    title: `${implementation}`,
    content: `Professional ${implementation.toLowerCase()} designed for your ${context?.category?.replace('_', ' ')?.toLowerCase() || 'digital'} product.`,
    metadata: {
      generated: true,
      category: context?.category || 'general',
      implementation: implementation,
      fallback: true,
      timestamp: new Date().toISOString()
    }
  };
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`GumGenie Backend active on ${PORT}`));
