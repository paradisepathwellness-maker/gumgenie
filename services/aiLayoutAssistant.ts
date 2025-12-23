import { GoogleGenAI, Type } from '@google/genai';
import { AiFormatResult, ContentBlock, Product, StylePreset } from '../types';

function requireEnv(name: string): string {
  const v = (process.env as any)?.[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// Client-side formatter for your current testing workflow.
// NOTE: this uses a client-exposed Gemini key (pre-launch only).
export async function formatBlockForLayoutClient(params: {
  product: Product;
  preset: StylePreset;
  block: Omit<ContentBlock, 'id'>;
}): Promise<AiFormatResult> {
  const ai = new GoogleGenAI({ apiKey: requireEnv('API_KEY') });

  const prompt = `You are a conversion-focused design + copy assistant.

TASK:
Given a Gumroad-style product listing and its current style preset, rewrite/format the NEW content block so it fits the page layout, matches the tone, and is easy to render.
Also provide improvement suggestions.

STYLE PRESET:
${JSON.stringify(params.preset)}

PRODUCT CONTEXT:
Title: ${params.product.title}
Category: ${params.product.category}
CTA: ${params.product.callToAction}
Existing blocks count: ${params.product.contentBlocks?.length || 0}

NEW BLOCK (input):
${JSON.stringify(params.block)}

RULES:
- Keep block.type the same unless it is clearly wrong.
- If type uses items (faq/checklist/feature-grid/stat-highlight/emoji-row), ensure items is a non-empty string array.
- If type is text, ensure content is non-empty and formatted for readability.
- Keep output concise and high-converting.
- Suggestions should be specific and actionable.`;

  const response = await ai.models.generateContent({
    model: (process.env as any).GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview',
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

  return JSON.parse(response.text) as AiFormatResult;
}
