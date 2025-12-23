import { GoogleGenAI, Type } from '@google/genai';
import { ContentBlock, Product, StylePreset } from '../types';
import type { AiFormatResult } from '../types';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function formatMcpOutput(params: {
  text: string;
  targetBlockType: ContentBlock['type'];
  product: Product;
  preset: StylePreset;
}): Promise<AiFormatResult> {
  const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });

  const prompt = `You are a conversion-focused landing page editor.

INPUT:
- Product context
- Style preset
- Raw MCP output text (often code snippets or component descriptions)

TASK:
Convert the MCP output into a high-converting content block suitable for a Gumroad listing.
Do NOT output code. Output only structured content for the chosen block type.

TARGET BLOCK TYPE: ${params.targetBlockType}

PRODUCT:
${JSON.stringify({
    title: params.product.title,
    category: params.product.category,
    price: params.product.price,
    callToAction: params.product.callToAction,
    features: params.product.features,
  })}

STYLE PRESET:
${JSON.stringify(params.preset)}

RAW MCP OUTPUT:
${params.text}

RULES:
- If target type is 'feature-grid'/'checklist'/'faq'/'stat-highlight'/'emoji-row': set a title and a short items[] list.
- If target type is 'text': set content with clear paragraphs and bullets.
- Keep output concise and high-converting.
- Avoid hallucinating libraries or code. Focus on marketing content.
- Provide 3–6 suggestions to improve conversion and visuals.`;

  const run = async () => ai.models.generateContent({
    model: process.env.GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          formattedBlock: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              items: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['type'],
          },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                reason: { type: Type.STRING },
                impact: { type: Type.STRING },
                action: { type: Type.STRING },
              },
              required: ['title', 'reason', 'impact', 'action'],
            },
          },
        },
        required: ['formattedBlock', 'suggestions'],
      },
    },
  });

  const timeoutMs = 20_000;
  const withTimeout = async () => {
    const p = run();
    const t = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI format timeout')), timeoutMs));
    return Promise.race([p, t]);
  };

  // One retry for transient failures
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await withTimeout();
      return JSON.parse((response as any).text) as AiFormatResult;
    } catch (e) {
      lastErr = e;
      // brief backoff
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('AI format failed');
}

