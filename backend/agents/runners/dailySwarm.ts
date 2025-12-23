import { GoogleGenAI, Type } from '@google/genai';
import { TemplateCategory } from '../../../types';
import { createTraceId } from '../../trace';
import type { AgentsGenerateResponse, AgentRunMeta, CopyContent, Monetization, Strategy, UnifiedBrief, Visuals } from '../definitions/schemas';
import { orchestratorPrompt, strategistPrompt, monetizationPrompt, copyPrompt, visualPrompt } from '../definitions/prompts';
import { loadSnapshot } from '../utils/snapshots';
import { mergeToProduct } from '../utils/merger';
import { generateNotionBlueprintDeterministic, generateNotionBlueprintFromGemini, type NotionBlueprintMode } from './notionBlueprint';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function nowMs() {
  return Date.now();
}

async function runJson<T>(ai: GoogleGenAI, prompt: string, schema: any): Promise<T> {
  const resp = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });
  return JSON.parse(resp.text) as T;
}

async function runWithRetry<T>(fn: () => Promise<T>): Promise<{ value: T | null; retried: boolean; error?: string }> {
  try {
    return { value: await fn(), retried: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      return { value: await fn(), retried: true };
    } catch (e2) {
      return { value: null, retried: true, error: e2 instanceof Error ? e2.message : msg };
    }
  }
}

export async function runDailySwarm(category: TemplateCategory): Promise<AgentsGenerateResponse> {
  const traceId = createTraceId();
  const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });

  const snapshotResult = await loadSnapshot(category);

  const agents: AgentRunMeta[] = [];

  // 1) Orchestrator
  const t0 = nowMs();
  const briefRes = await runWithRetry(async () =>
    runJson<{ brief: UnifiedBrief }>(
      ai,
      orchestratorPrompt({ category, research: snapshotResult.snapshot }),
      {
        type: Type.OBJECT,
        properties: {
          brief: {
            type: Type.OBJECT,
            properties: {
              persona: { type: Type.STRING },
              usp: { type: Type.STRING },
              constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
              mustInclude: { type: Type.ARRAY, items: { type: Type.STRING } },
              vibe: { type: Type.STRING },
            },
            required: ['persona', 'usp', 'constraints', 'mustInclude', 'vibe'],
          },
        },
        required: ['brief'],
      }
    )
  );
  agents.push({ agent: 'orchestrator', ok: !!briefRes.value, durationMs: nowMs() - t0, retried: briefRes.retried, fallbackUsed: !briefRes.value, error: briefRes.error });
  const brief = briefRes.value?.brief || null;

  // 2) Specialists in parallel
  const strategistTask = async () =>
    runJson<{ strategy: Strategy }>(
      ai,
      strategistPrompt({ category, brief: brief || { persona: 'General buyer', usp: 'High value', constraints: [], mustInclude: [], vibe: 'premium' }, research: snapshotResult.snapshot }),
      {
        type: Type.OBJECT,
        properties: {
          strategy: {
            type: Type.OBJECT,
            properties: {
              targetAudience: { type: Type.STRING },
              corePainPoint: { type: Type.STRING },
              mechanismName: { type: Type.STRING },
              uniqueSellingProp: { type: Type.STRING },
              seoKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['targetAudience', 'corePainPoint', 'mechanismName', 'uniqueSellingProp', 'seoKeywords'],
          },
        },
        required: ['strategy'],
      }
    );

  const strategistStart = nowMs();
  const strategyRes = await runWithRetry(strategistTask);
  agents.push({
    agent: 'strategist',
    ok: !!strategyRes.value,
    durationMs: nowMs() - strategistStart,
    retried: strategyRes.retried,
    fallbackUsed: !strategyRes.value,
    error: strategyRes.error,
  });
  const strategy = strategyRes.value?.strategy || null;

  const monetizationTask = async () =>
    runJson<{ monetization: Monetization }>(
      ai,
      monetizationPrompt({ category, strategy: strategy || { targetAudience: 'General', corePainPoint: 'Time', mechanismName: 'System', uniqueSellingProp: 'Better', seoKeywords: [] }, research: snapshotResult.snapshot }),
      {
        type: Type.OBJECT,
        properties: {
          monetization: {
            type: Type.OBJECT,
            properties: {
              tiers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    features: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['name', 'price', 'features'],
                },
              },
              bonuses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { title: { type: Type.STRING }, value: { type: Type.STRING } },
                  required: ['title', 'value'],
                },
              },
              guaranteePolicy: { type: Type.STRING },
            },
            required: ['tiers', 'bonuses', 'guaranteePolicy'],
          },
        },
        required: ['monetization'],
      }
    );

  const copyTask = async () =>
    runJson<{ content: CopyContent }>(
      ai,
      copyPrompt({ category, brief: brief || { persona: 'General buyer', usp: 'High value', constraints: [], mustInclude: [], vibe: 'premium' }, seoKeywords: strategy?.seoKeywords }),
      {
        type: Type.OBJECT,
        properties: {
          content: {
            type: Type.OBJECT,
            properties: {
              productTitle: { type: Type.STRING },
              hookHeadline: { type: Type.STRING },
              descriptionMarkdown: { type: Type.STRING },
              features: { type: Type.ARRAY, items: { type: Type.STRING } },
              faq: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } },
                  required: ['question', 'answer'],
                },
              },
              callToAction: { type: Type.STRING },
            },
            required: ['productTitle', 'hookHeadline', 'descriptionMarkdown', 'features', 'faq', 'callToAction'],
          },
        },
        required: ['content'],
      }
    );

  const visualTask = async () =>
    runJson<{ visuals: Visuals }>(
      ai,
      visualPrompt({ category, brief: brief || { persona: 'General buyer', usp: 'High value', constraints: [], mustInclude: [], vibe: 'premium' } }),
      {
        type: Type.OBJECT,
        properties: {
          visuals: {
            type: Type.OBJECT,
            properties: {
              stylePreset: {
                type: Type.OBJECT,
                properties: {
                  themeName: { type: Type.STRING },
                  colors: {
                    type: Type.OBJECT,
                    properties: { bg: { type: Type.STRING }, text: { type: Type.STRING }, primary: { type: Type.STRING } },
                    required: ['bg', 'text', 'primary'],
                  },
                  fontPairing: { type: Type.STRING },
                },
                required: ['themeName', 'colors', 'fontPairing'],
              },
              emojiSet: { type: Type.ARRAY, items: { type: Type.STRING } },
              canvasSettings: {
                type: Type.OBJECT,
                properties: {
                  heroBackgroundEffect: { type: Type.STRING },
                  heroDitherIntensity: { type: Type.NUMBER },
                },
                required: ['heroBackgroundEffect', 'heroDitherIntensity'],
              },
              recommendedMcpComponents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { library: { type: Type.STRING }, component: { type: Type.STRING }, reason: { type: Type.STRING } },
                  required: ['library', 'component', 'reason'],
                },
              },
            },
            required: ['stylePreset', 'emojiSet', 'canvasSettings', 'recommendedMcpComponents'],
          },
        },
        required: ['visuals'],
      }
    );

  const withTiming = async <T>(agentName: AgentRunMeta['agent'], task: () => Promise<T>) => {
    const start = nowMs();
    const res = await runWithRetry(task);
    const durationMs = nowMs() - start;
    return { agentName, res, durationMs };
  };

  const [monetizationTimed, copyTimed, visualsTimed] = await Promise.all([
    withTiming('monetization', monetizationTask),
    withTiming('copy', copyTask),
    withTiming('visual', visualTask),
  ]);

  const monetizationRes = monetizationTimed.res;
  const copyRes = copyTimed.res;
  const visualsRes = visualsTimed.res;

  agents.push({
    agent: 'monetization',
    ok: !!monetizationRes.value,
    durationMs: monetizationTimed.durationMs,
    retried: monetizationRes.retried,
    fallbackUsed: !monetizationRes.value,
    error: monetizationRes.error,
  });
  agents.push({
    agent: 'copy',
    ok: !!copyRes.value,
    durationMs: copyTimed.durationMs,
    retried: copyRes.retried,
    fallbackUsed: !copyRes.value,
    error: copyRes.error,
  });
  agents.push({
    agent: 'visual',
    ok: !!visualsRes.value,
    durationMs: visualsTimed.durationMs,
    retried: visualsRes.retried,
    fallbackUsed: !visualsRes.value,
    error: visualsRes.error,
  });

  // Notion Templates: generate a deterministic (default) or Gemini-assisted blueprint
  let notionBlueprintMode: NotionBlueprintMode | undefined;
  let notionBlueprint: any | undefined;
  if (category === TemplateCategory.NOTION_TEMPLATES) {
    notionBlueprintMode = process.env.NOTION_BLUEPRINT_MODE === 'gemini' ? 'gemini' : 'deterministic';
    notionBlueprint =
      notionBlueprintMode === 'gemini'
        ? await generateNotionBlueprintFromGemini({ brief: brief?.usp })
        : generateNotionBlueprintDeterministic();
  }

  const merged = mergeToProduct({
    category,
    brief,
    strategy,
    monetization: monetizationRes.value?.monetization || null,
    content: copyRes.value?.content || null,
    visuals: visualsRes.value?.visuals || null,
    agents,
  });

  return {
    product: merged.product,
    preset: merged.preset,
    meta: {
      traceId,
      generatedAt: new Date().toISOString(),
      category,
      agents,
      snapshotUsed: !!snapshotResult.snapshot,
      snapshotPath: snapshotResult.snapshotPath,
      notionBlueprintMode,
      notionBlueprint,
    },
  };
}
