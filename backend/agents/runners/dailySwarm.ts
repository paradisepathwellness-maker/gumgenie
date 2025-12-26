import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'node:crypto';
import { TemplateCategory } from '../../../types';
import { TraceLogger, createTraceId, isTraceEnabled } from '../../trace';
import type { SseSend } from '../utils/sse';
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

async function runJson<T>(
  ai: GoogleGenAI,
  prompt: string,
  schema: any,
  meta: { agent: string; purpose: string },
  trace?: TraceLogger,
  sse?: SseSend
): Promise<T> {
  const model = process.env.GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview';
  const config = {
    responseMimeType: 'application/json',
    responseSchema: schema,
  };

  const promptChars = prompt.length;
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 12);
  const startedAt = Date.now();

  trace?.add('llm.request.started', { agent: meta.agent, purpose: meta.purpose, model, config: { responseMimeType: config.responseMimeType }, promptChars, promptHash });
  sse?.('llm.request.started', { agent: meta.agent, purpose: meta.purpose, model, config: { responseMimeType: config.responseMimeType }, promptChars, promptHash });

  const resp: any = await ai.models.generateContent({
    model,
    contents: prompt,
    config,
  });

  // Best-effort token usage extraction (SDK-dependent)
  const usage = resp?.usageMetadata || resp?.usage || null;
  trace?.add('llm.request.completed', { agent: meta.agent, purpose: meta.purpose, model, durationMs: Date.now() - startedAt, usage });
  sse?.('llm.request.completed', { agent: meta.agent, purpose: meta.purpose, model, durationMs: Date.now() - startedAt, usage });

  const raw = String(resp.text || '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`LLM returned non-JSON for ${meta.agent}/${meta.purpose}`);
  }

  // Minimal schema enforcement: require the top-level key for this purpose.
  const requiredTopLevelByPurpose: Record<string, string> = {
    brief: 'brief',
    strategy: 'strategy',
    pricing: 'monetization',
    copy: 'content',
    visuals: 'visuals',
  };
  const requiredKey = requiredTopLevelByPurpose[meta.purpose];
  if (requiredKey && (!parsed || typeof parsed !== 'object' || !(requiredKey in (parsed as any)))) {
    throw new Error(`Schema validation failed for ${meta.agent}/${meta.purpose}: missing top-level '${requiredKey}'`);
  }

  return parsed as T;
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

export async function runDailySwarm(category: TemplateCategory, opts?: { sseSend?: SseSend }): Promise<AgentsGenerateResponse> { 

  const traceId = createTraceId();
  const trace = new TraceLogger(traceId);
  const sse = opts?.sseSend;
  if (isTraceEnabled()) {
    trace.add('run.started', { category });
  }
  sse?.('run.started', { traceId, category, ts: new Date().toISOString() });

  const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });

  trace.add('snapshot.started');
  sse?.('snapshot.started', { category });
  const snapshotResult = await loadSnapshot(category);
  trace.add('snapshot.completed', { snapshotUsed: !!snapshotResult.snapshot, snapshotPath: snapshotResult.snapshotPath });
  sse?.('snapshot.completed', { snapshotUsed: !!snapshotResult.snapshot, snapshotPath: snapshotResult.snapshotPath });

  const agents: AgentRunMeta[] = [];

  // 1) Orchestrator
  trace.add('agent.orchestrator.started');
  sse?.('agent.started', { agent: 'orchestrator' });
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
      },
      { agent: 'orchestrator', purpose: 'brief' },
      trace,
      sse
    )
  );
  agents.push({ agent: 'orchestrator', ok: !!briefRes.value, durationMs: nowMs() - t0, retried: briefRes.retried, fallbackUsed: !briefRes.value, error: briefRes.error });
  trace.add('agent.orchestrator.completed', { ok: !!briefRes.value, durationMs: nowMs() - t0, retried: briefRes.retried, fallbackUsed: !briefRes.value, error: briefRes.error });
  if (briefRes.retried) sse?.('agent.retry', { agent: 'orchestrator' });
  if (briefRes.error) sse?.('agent.error', { agent: 'orchestrator', error: briefRes.error });
  sse?.('agent.completed', { agent: 'orchestrator', ok: !!briefRes.value, durationMs: nowMs() - t0, retried: briefRes.retried, fallbackUsed: !briefRes.value, error: briefRes.error });
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
      },
      { agent: 'strategist', purpose: 'strategy' },
      trace,
      sse
    );

  const strategistStart = nowMs();
  trace.add('agent.strategist.started');
  sse?.('agent.started', { agent: 'strategist' });
  const strategyRes = await runWithRetry(strategistTask);
  agents.push({
    agent: 'strategist',
    ok: !!strategyRes.value,
    durationMs: nowMs() - strategistStart,
    retried: strategyRes.retried,
    fallbackUsed: !strategyRes.value,
    error: strategyRes.error,
  });
  trace.add('agent.strategist.completed', { ok: !!strategyRes.value, durationMs: nowMs() - strategistStart, retried: strategyRes.retried, fallbackUsed: !strategyRes.value, error: strategyRes.error });
  if (strategyRes.retried) sse?.('agent.retry', { agent: 'strategist' });
  if (strategyRes.error) sse?.('agent.error', { agent: 'strategist', error: strategyRes.error });
  sse?.('agent.completed', { agent: 'strategist', ok: !!strategyRes.value, durationMs: nowMs() - strategistStart, retried: strategyRes.retried, fallbackUsed: !strategyRes.value, error: strategyRes.error });
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
      },
      { agent: 'monetization', purpose: 'pricing' },
      trace,
      sse
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
      },
      { agent: 'copy', purpose: 'copy' },
      trace,
      sse
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
      },
      { agent: 'visual', purpose: 'visuals' },
      trace,
      sse
    );

  const withTiming = async <T>(agentName: AgentRunMeta['agent'], task: () => Promise<T>) => {
    const start = nowMs();
    const res = await runWithRetry(task);
    const durationMs = nowMs() - start;
    return { agentName, res, durationMs };
  };

  trace.add('agent.monetization.started');
  trace.add('agent.copy.started');
  trace.add('agent.visual.started');
  sse?.('agent.started', { agent: 'monetization' });
  sse?.('agent.started', { agent: 'copy' });
  sse?.('agent.started', { agent: 'visual' });

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
  trace.add('agent.monetization.completed', { ok: !!monetizationRes.value, durationMs: monetizationTimed.durationMs, retried: monetizationRes.retried, fallbackUsed: !monetizationRes.value, error: monetizationRes.error });
  if (monetizationRes.retried) sse?.('agent.retry', { agent: 'monetization' });
  if (monetizationRes.error) sse?.('agent.error', { agent: 'monetization', error: monetizationRes.error });
  sse?.('agent.completed', { agent: 'monetization', ok: !!monetizationRes.value, durationMs: monetizationTimed.durationMs, retried: monetizationRes.retried, fallbackUsed: !monetizationRes.value, error: monetizationRes.error });

  agents.push({
    agent: 'copy',
    ok: !!copyRes.value,
    durationMs: copyTimed.durationMs,
    retried: copyRes.retried,
    fallbackUsed: !copyRes.value,
    error: copyRes.error,
  });
  trace.add('agent.copy.completed', { ok: !!copyRes.value, durationMs: copyTimed.durationMs, retried: copyRes.retried, fallbackUsed: !copyRes.value, error: copyRes.error });
  if (copyRes.retried) sse?.('agent.retry', { agent: 'copy' });
  if (copyRes.error) sse?.('agent.error', { agent: 'copy', error: copyRes.error });
  sse?.('agent.completed', { agent: 'copy', ok: !!copyRes.value, durationMs: copyTimed.durationMs, retried: copyRes.retried, fallbackUsed: !copyRes.value, error: copyRes.error });

  agents.push({
    agent: 'visual',
    ok: !!visualsRes.value,
    durationMs: visualsTimed.durationMs,
    retried: visualsRes.retried,
    fallbackUsed: !visualsRes.value,
    error: visualsRes.error,
  });
  trace.add('agent.visual.completed', { ok: !!visualsRes.value, durationMs: visualsTimed.durationMs, retried: visualsRes.retried, fallbackUsed: !visualsRes.value, error: visualsRes.error });
  if (visualsRes.retried) sse?.('agent.retry', { agent: 'visual' });
  if (visualsRes.error) sse?.('agent.error', { agent: 'visual', error: visualsRes.error });
  sse?.('agent.completed', { agent: 'visual', ok: !!visualsRes.value, durationMs: visualsTimed.durationMs, retried: visualsRes.retried, fallbackUsed: !visualsRes.value, error: visualsRes.error });

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

  trace.add('merge.started');
  sse?.('merge.started', {});
  const merged = mergeToProduct({
    category,
    brief,
    strategy,
    monetization: monetizationRes.value?.monetization || null,
    content: copyRes.value?.content || null,
    visuals: visualsRes.value?.visuals || null,
    agents,
  });

  trace.add('merge.completed', { blocks: merged.product?.contentBlocks?.length ?? 0 });
  sse?.('merge.completed', { blocks: merged.product?.contentBlocks?.length ?? 0 });
  trace.add('run.completed');
  sse?.('run.completed', { traceId });
  await trace.flush();

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
