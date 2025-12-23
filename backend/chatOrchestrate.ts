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
