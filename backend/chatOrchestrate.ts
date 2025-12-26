import { GoogleGenAI, Type } from '@google/genai';
import { ContentBlock, Product, StylePreset } from '../types';
import type { McpToolsListResult } from './mcpSchemas';
import type { StdioMcpServerId } from './mcpStdioServers';

export type ChatOrchestrateMode = 'ask' | 'turbo';

export type ToolRecommendation = {
  serverId: StdioMcpServerId;
  toolName: string;
  args: Record<string, unknown>;
  targetBlockType: ContentBlock['type'];
  rationale: string;
};

export type ChatOrchestrateRequest = {
  message: string;
  mode: ChatOrchestrateMode;
  context?: {
    category?: string;
    contentArea?: string;
    currentContent?: string;
  };
  // Needed for formatting into Canvas-ready blocks
  product?: Product;
  preset?: StylePreset;
  // tool catalog (cached upstream)
  toolCatalog: {
    servers: { id: StdioMcpServerId; label: string }[];
    toolsByServerId: Record<string, McpToolsListResult>;
  };
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function normalizeBlockType(t: string): ContentBlock['type'] {
  const allowed: ContentBlock['type'][] = ['text', 'feature-grid', 'faq', 'checklist', 'stat-highlight', 'emoji-row', 'testimonial', 'pricing', 'gallery'];
  const v = String(t || '').trim();
  return (allowed as string[]).includes(v) ? (v as ContentBlock['type']) : 'feature-grid';
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function safeJsonParseObject(input: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(input);
    return isRecord(v) ? v : null;
  } catch {
    return null;
  }
}

export function validateRecommendation(
  rec: any,
  toolCatalog: ChatOrchestrateRequest['toolCatalog']
): { ok: true; value: ToolRecommendation } | { ok: false; error: string } {
  const allowedServers = new Set(toolCatalog.servers.map((s) => s.id));
  const allowedBlockTypes: ContentBlock['type'][] = ['text', 'feature-grid', 'faq', 'checklist', 'stat-highlight', 'emoji-row', 'testimonial', 'pricing', 'gallery'];

  const serverId = String(rec?.serverId || '').trim();
  const toolName = String(rec?.toolName || '').trim();
  const targetBlockTypeRaw = String(rec?.targetBlockType || '').trim();
  const rationale = String(rec?.rationale || '');

  if (!serverId || !allowedServers.has(serverId as StdioMcpServerId)) {
    return { ok: false, error: `Invalid serverId: ${serverId || '(empty)'}` };
  }
  if (!toolName) {
    return { ok: false, error: 'Invalid toolName: empty' };
  }

  const tools = toolCatalog.toolsByServerId[serverId]?.tools || [];
  const toolNames = new Set(tools.map((t) => t.name));
  if (toolNames.size > 0 && !toolNames.has(toolName)) {
    return { ok: false, error: `toolName not found on server ${serverId}: ${toolName}` };
  }

  const args = (() => {
    // recommendTool returns args already parsed, but this validator is defensive.
    if (isRecord(rec?.args)) return rec.args as Record<string, unknown>;
    const maybe = safeJsonParseObject(String(rec?.argsJson || '{}'));
    return maybe ?? {};
  })();

  const targetBlockType = (allowedBlockTypes as string[]).includes(targetBlockTypeRaw)
    ? (targetBlockTypeRaw as ContentBlock['type'])
    : 'feature-grid';

  return {
    ok: true,
    value: {
      serverId: serverId as StdioMcpServerId,
      toolName,
      args,
      targetBlockType,
      rationale,
    },
  };
}

export function deterministicFallbackRecommendation(
  toolCatalog: ChatOrchestrateRequest['toolCatalog'],
  reason: string
): ToolRecommendation {
  // Deterministic fallback: prefer magicui, then shadcn, then magic, else first available.
  const preferred: StdioMcpServerId[] = ['magicui', 'shadcn', 'magic'];
  const server =
    preferred.find((id) => toolCatalog.servers.some((s) => s.id === id)) ||
    toolCatalog.servers[0]?.id ||
    ('shadcn' as StdioMcpServerId);

  const tools = toolCatalog.toolsByServerId[server]?.tools || [];
  const toolName = tools[0]?.name || 'tools/list';

  return {
    serverId: server as StdioMcpServerId,
    toolName,
    args: {},
    targetBlockType: 'feature-grid',
    rationale: `Fallback recommendation used: ${reason}`,
  };
}

export async function recommendTool(req: ChatOrchestrateRequest): Promise<ToolRecommendation> {
  const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });

  const toolsSummary = req.toolCatalog.servers
    .map((s) => {
      const tools = req.toolCatalog.toolsByServerId[s.id]?.tools || [];
      const names = tools.map((t) => t.name).slice(0, 80);
      return `${s.id} (${s.label}): ${names.join(', ')}`;
    })
    .join('\n');

  const prompt = `You are an automation planner for a Gumroad listing builder.

Your job: pick EXACTLY ONE MCP stdio tool to run next.

User message: ${req.message}
Category: ${req.context?.category || 'General'}

Available MCP tools (by server):
${toolsSummary}

Rules:
- Choose toolName exactly as provided.
- Keep args minimal; if unsure, set {}.
- Use targetBlockType that best matches the user intent.
- Prefer magicui for layout components; shadcn for registry/ui; magic for advanced generation.
- Do not include markdown or code fences.`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          serverId: { type: Type.STRING },
          toolName: { type: Type.STRING },
          argsJson: { type: Type.STRING },
          targetBlockType: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: ['serverId', 'toolName', 'argsJson', 'targetBlockType', 'rationale'],
      },
    },
  });

  const parsed = JSON.parse(response.text) as any;

  return {
    serverId: parsed.serverId as StdioMcpServerId,
    toolName: String(parsed.toolName),
    args: (() => {
      try {
        const v = JSON.parse(String(parsed.argsJson || '{}'));
        return v && typeof v === 'object' ? v : {};
      } catch {
        return {};
      }
    })(),
    targetBlockType: normalizeBlockType(parsed.targetBlockType),
    rationale: String(parsed.rationale || ''),
  };
}

export function extractMcpText(result: { content?: { type: string; text?: string }[] } | null | undefined): string {
  const text = (result?.content || [])
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('\n')
    .trim();
  return text;
}
