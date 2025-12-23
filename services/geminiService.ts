import { GoogleGenAI, Type } from "@google/genai";
import { TemplateCategory, Product, StylePreset, ContentBlock } from "../types";

const apiKey = import.meta.env.VITE_API_KEY || ""; // Use Vite-compatible environment variable
const ai = new GoogleGenAI({ apiKey });

export const generateProductContent = async (category: TemplateCategory): Promise<{ product: Product, presets: StylePreset[] }> => {
  const categoryNames = {
    [TemplateCategory.AI_PROMPTS]: "AI Prompt Engineering Pack",
    [TemplateCategory.NOTION_TEMPLATES]: "Premium Notion Dashboard",
    [TemplateCategory.DIGITAL_PLANNERS]: "Digital Productivity Planner",
    [TemplateCategory.DESIGN_TEMPLATES]: "Social Media Design Kit",
  };

  const prompt = `Generate a high-converting Gumroad product for the category: ${categoryNames[category]}. 
  The response should include a compelling title, a detailed Markdown description, 3-5 key features, and a recommended price in USD.
  
  EXTRAS: 
  - generate a set of 5-8 relevant emojis that match the product's vibe.
  - generate 2 "extraComponents" which are structured blocks like a checklist, a small FAQ, or stat highlights.
  
  ALSO, generate exactly 6 distinct visual style presets (modern, aggressive, minimal, retro, premium, brutalist) for this specific product.
  Each preset must contain:
  - name: (e.g., "Apple Minimal", "Tokyo Night", "Swiss Clean", "Cyberpunk", "Classic Premium", "Raw Brutalist")
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
    model: (process.env as any).GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
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
                    type: { type: Type.STRING, description: "One of: feature-grid, faq, checklist, stat-highlight" },
                    title: { type: Type.STRING },
                    items: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["type", "title", "items"]
                }
              }
            },
            required: ["title", "description", "price", "features", "callToAction", "emojiSet", "extraComponents"],
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
              required: ["name", "gradientIndex", "layoutType", "headlineType", "buttonStyle", "buttonIcon", "shadowStyle", "accentOpacity", "titleWeight", "descWeight", "fontFamily", "containerStyle", "backgroundTexture"]
            }
          }
        },
        required: ["product", "presets"],
      }
    }
  });

  const rawData = JSON.parse(response.text);
  
  const images = {
    [TemplateCategory.AI_PROMPTS]: 'https://picsum.photos/seed/prompt/1200/800',
    [TemplateCategory.NOTION_TEMPLATES]: 'https://picsum.photos/seed/notion/1200/800',
    [TemplateCategory.DIGITAL_PLANNERS]: 'https://picsum.photos/seed/planner/1200/800',
    [TemplateCategory.DESIGN_TEMPLATES]: 'https://picsum.photos/seed/design/1200/800',
  };

  return {
    product: {
      ...rawData.product,
      category,
      coverImage: images[category],
    },
    presets: rawData.presets
  };
};

export const enhanceContent = async (text: string, context: string): Promise<string> => {
  const prompt = `Enhance the following text to be more compelling, professional, and optimized for sales conversion on Gumroad. 
  Context: ${context}
  Text to enhance: ${text}
  Return ONLY the enhanced text string.`;

  const response = await ai.models.generateContent({
    model: (process.env as any).GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || text;
};

export const regenerateSection = async (sectionType: string, context: string): Promise<any> => {
  const prompt = `Regenerate a new version of a ${sectionType} for a digital product.
  Context: ${context}
  Return the result in JSON format appropriate for that section type.`;

  const response = await ai.models.generateContent({
    model: (process.env as any).GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text);
};
