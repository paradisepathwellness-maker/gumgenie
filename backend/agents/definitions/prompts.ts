import type { TemplateCategory } from '../../../types';
import type { ResearchData, UnifiedBrief } from './schemas';

export function categoryLabel(category: TemplateCategory): string {
  const map: Record<TemplateCategory, string> = {
    AI_PROMPTS: 'AI Prompts',
    NOTION_TEMPLATES: 'Notion Templates',
    DIGITAL_PLANNERS: 'Digital Planners',
    DESIGN_TEMPLATES: 'Design Templates',
  };
  return map[category];
}

export function orchestratorPrompt(args: { category: TemplateCategory; research?: ResearchData | null }) {
  const { category, research } = args;
  return `You are the Orchestrator Agent.

Create a Unified Brief shared by all downstream agents.

Category: ${categoryLabel(category)}

If research is provided, treat it as ground truth and do not contradict it.

Research (optional JSON): ${research ? JSON.stringify(research).slice(0, 6000) : 'none'}

Return ONLY JSON with shape:
{ "brief": { "persona": string, "usp": string, "constraints": string[], "mustInclude": string[], "vibe": string } }`;
}

export function strategistPrompt(args: { category: TemplateCategory; brief: UnifiedBrief; research?: ResearchData | null }) {
  const { category, brief, research } = args;
  return `You are the Strategist Agent.

Category: ${categoryLabel(category)}
Unified Brief (JSON): ${JSON.stringify(brief)}
Research (optional JSON): ${research ? JSON.stringify(research).slice(0, 6000) : 'none'}

Return ONLY JSON with shape:
{ "strategy": { "targetAudience": string, "corePainPoint": string, "mechanismName": string, "uniqueSellingProp": string, "seoKeywords": string[] } }`;
}

export function monetizationPrompt(args: { category: TemplateCategory; strategy: any; research?: ResearchData | null }) {
  const { category, strategy, research } = args;
  return `You are the Monetization Agent.

Category: ${categoryLabel(category)}
Strategy (JSON): ${JSON.stringify(strategy)}
Research.stats (optional): ${research?.stats ? JSON.stringify(research.stats) : 'none'}

Return ONLY JSON with shape:
{ "monetization": { "tiers": [{"name": string, "price": number, "features": string[]}], "bonuses": [{"title": string, "value": string}], "guaranteePolicy": string } }`;
}

export function copyPrompt(args: { category: TemplateCategory; brief: UnifiedBrief; seoKeywords?: string[] }) {
  const { category, brief, seoKeywords } = args;
  return `You are the Copy Agent.

Category: ${categoryLabel(category)}
Unified Brief (JSON): ${JSON.stringify(brief)}
SEO Keywords: ${(seoKeywords || []).join(', ')}

Return ONLY JSON with shape:
{ "content": { "productTitle": string, "hookHeadline": string, "descriptionMarkdown": string, "features": string[], "faq": [{"question": string, "answer": string}], "callToAction": string } }`;
}

export function visualPrompt(args: { category: TemplateCategory; brief: UnifiedBrief }) {
  const { category, brief } = args;
  return `You are the Visual Agent.

Category: ${categoryLabel(category)}
Unified Brief vibe: ${brief.vibe}

Return ONLY JSON with shape:
{ "visuals": { "stylePreset": { "themeName": string, "colors": {"bg": string, "text": string, "primary": string}, "fontPairing": string }, "emojiSet": string[], "canvasSettings": { "heroBackgroundEffect": "lightrays"|"dither"|"none", "heroDitherIntensity": number }, "recommendedMcpComponents": [{"library": "magicui"|"shadcn", "component": string, "reason": string}] } }`;
}
