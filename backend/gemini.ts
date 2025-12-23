import { GoogleGenAI, Type } from '@google/genai';
import { TemplateCategory } from '../types';

export type GenerateProductResponse = {
  product: {
    title: string;
    description: string;
    price: number;
    features: string[];
    callToAction: string;
    emojiSet: string[];
    extraComponents: { type: string; title: string; items: string[] }[];
  };
  presets: {
    name: string;
    gradientIndex: number;
    layoutType: string;
    headlineType: string;
    buttonStyle: string;
    buttonIcon: string;
    shadowStyle: string;
    accentOpacity: number;
    titleWeight: string;
    descWeight: string;
    fontFamily: string;
    containerStyle: string;
    backgroundTexture: string;
  }[];
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function generateProductFromGemini(category: TemplateCategory): Promise<GenerateProductResponse> {
  const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });

  const categoryNames: Record<TemplateCategory, string> = {
    [TemplateCategory.AI_PROMPTS]: 'AI Prompt Engineering Pack',
    [TemplateCategory.NOTION_TEMPLATES]: 'Premium Notion Dashboard',
    [TemplateCategory.DIGITAL_PLANNERS]: 'Digital Productivity Planner',
    [TemplateCategory.DESIGN_TEMPLATES]: 'Social Media Design Kit',
  };

  const prompt = `Generate a high-converting Gumroad product for the category: ${categoryNames[category]}.
The response should include a compelling title, a detailed Markdown description, 3-5 key features, and a recommended price in USD.

EXTRAS:
- generate a set of 5-8 relevant emojis that match the product's vibe.
- generate 2 "extraComponents" which are structured blocks like a checklist, a small FAQ, or stat highlights.

ALSO, generate exactly 6 distinct visual style presets (modern, aggressive, minimal, retro, premium, brutalist) for this specific product.
Each preset must contain:
- name
- gradientIndex: (0 to 3)
- layoutType: ('classic', 'centered', 'split', 'minimal')
- headlineType: ('benefit', 'problem', 'scarcity', 'direct')
- buttonStyle: ('rounded', 'square', 'pill', 'outline')
- buttonIcon: ('download', 'unlock', 'cart', 'zap')
- shadowStyle: ('subtle', 'deep', 'neumorphic')
- accentOpacity: (0 to 100)
- titleWeight: ('normal', 'bold', 'black')
- descWeight: ('normal', 'bold', 'black')
- fontFamily: ('sans', 'serif', 'mono')
- containerStyle: ('glass', 'flat', 'brutalist')
- backgroundTexture: ('none', 'dots', 'grid', 'mesh')

Make the content sound professional, high-value, and specialized. Use the emojis provided in the title and description where appropriate.`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          product: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              price: { type: Type.NUMBER },
              features: { type: Type.ARRAY, items: { type: Type.STRING } },
              callToAction: { type: Type.STRING },
              emojiSet: { type: Type.ARRAY, items: { type: Type.STRING } },
              extraComponents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: 'One of: feature-grid, faq, checklist, stat-highlight' },
                    title: { type: Type.STRING },
                    items: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['type', 'title', 'items'],
                },
              },
            },
            required: ['title', 'description', 'price', 'features', 'callToAction', 'emojiSet', 'extraComponents'],
          },
          presets: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                gradientIndex: { type: Type.NUMBER },
                layoutType: { type: Type.STRING },
                headlineType: { type: Type.STRING },
                buttonStyle: { type: Type.STRING },
                buttonIcon: { type: Type.STRING },
                shadowStyle: { type: Type.STRING },
                accentOpacity: { type: Type.NUMBER },
                titleWeight: { type: Type.STRING },
                descWeight: { type: Type.STRING },
                fontFamily: { type: Type.STRING },
                containerStyle: { type: Type.STRING },
                backgroundTexture: { type: Type.STRING },
              },
              required: [
                'name',
                'gradientIndex',
                'layoutType',
                'headlineType',
                'buttonStyle',
                'buttonIcon',
                'shadowStyle',
                'accentOpacity',
                'titleWeight',
                'descWeight',
                'fontFamily',
                'containerStyle',
                'backgroundTexture',
              ],
            },
          },
        },
        required: ['product', 'presets'],
      },
    },
  });

  const raw = JSON.parse(response.text);
  return raw as GenerateProductResponse;
}
