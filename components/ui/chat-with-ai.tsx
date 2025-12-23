"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpIcon,
  MessageCircle,
  Minimize2,
  Maximize2,
  RefreshCcw,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { PromptInput, PromptInputActions, PromptInputTextarea } from "@/components/ui/prompt-input";
import { useStore } from "@/store";
import type { ChatMode, ChatOption, ChatToolPreview, TemplateCategory } from "@/types";

export interface ChatWithAIProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    category?: string;
    contentArea?: string;
    currentContent?: string;
  };
}

type WorkflowCategory = "AI_PROMPTS" | "NOTION_TEMPLATES" | "DIGITAL_PLANNERS" | "DESIGN_TEMPLATES";

type WorkflowButton = { label: string; prompt: string };

const WORKFLOW_BUTTONS: Record<WorkflowCategory, WorkflowButton[]> = {
  AI_PROMPTS: [
    { label: "Pricing Strategy (3 tiers)", prompt: "Create a 3-tier pricing strategy with value anchoring for my AI prompts product." },
    { label: "Framework Showcase", prompt: "Generate a framework showcase section that demonstrates the structure and outcomes of the prompt systems." },
    { label: "Technical Credibility", prompt: "Create a technical credibility section with measurable proof and multi-model compatibility." },
    { label: "Developer Testimonials", prompt: "Generate developer testimonial ideas with specific outcomes and metrics." },
  ],
  NOTION_TEMPLATES: [
    { label: "Pricing Strategy (3 tiers)", prompt: "Create a 3-tier pricing strategy for my Notion template with clear upgrade paths." },
    { label: "Database Showcase", prompt: "Generate a Notion database showcase section (views, relations, rollups, workflows)." },
    { label: "Setup Simplicity", prompt: "Create a setup simplicity section (under 10 minutes) with a clear onboarding flow." },
    { label: "Professional Testimonials", prompt: "Generate professional testimonial ideas (teams, consultants, founders) with measurable wins." },
  ],
  DIGITAL_PLANNERS: [
    { label: "Pricing Strategy (3 tiers)", prompt: "Create a 3-tier pricing strategy for an aesthetic digital planner product." },
    { label: "Aesthetic Gallery", prompt: "Generate an aesthetic gallery section concept that highlights planner spreads and vibe." },
    { label: "App Compatibility", prompt: "Create an app compatibility section (Goodnotes/Notability/Noteshelf) with benefits." },
    { label: "Community & Social Proof", prompt: "Generate community-driven social proof ideas (UGC, before/after, routine wins)." },
  ],
  DESIGN_TEMPLATES: [
    { label: "Pricing Strategy (3 tiers)", prompt: "Create a 3-tier pricing strategy for design templates with commercial licensing." },
    { label: "Agency ROI Calculator", prompt: "Design an agency ROI calculator section that shows time saved and client value." },
    { label: "Platform Compatibility", prompt: "Generate a platform compatibility section (Figma/Canva/Adobe) with deliverables." },
    { label: "Case Studies", prompt: "Generate case study card concepts with outcomes and timelines." },
  ],
};

const STYLE_OPTIONS: ChatOption[] = [
  { label: "Glassmorphic", value: "style:glassmorphic" },
  { label: "Minimalist", value: "style:minimal" },
  { label: "3D animated", value: "style:3d" },
  { label: "Brutalist", value: "style:brutalist" },
];

function categoryLabel(category?: TemplateCategory | string | null) {
  if (!category) return "General";
  return String(category).replace(/_/g, " ");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

type ChatSendContext = {
  category?: TemplateCategory | null;
  contentArea?: string;
  currentContent?: string;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt || "request failed"}`);
  }
  return res.json() as Promise<T>;
}

function useChatController() {
  const {
    chatMessages,
    chatPhase,
    chatContext,
    isChatLoading,
    currentCategory,
    generatedProduct,
    presets,
    activePresetIndex,
    addChatMessage,
    setChatLoading,
    setChatPhase,
    chatMode,
  } = useStore();

  const resolvedContext: ChatSendContext = useMemo(
    () => ({
      category: chatContext?.category ?? currentCategory,
      contentArea: chatContext?.contentArea,
      currentContent: chatContext?.currentContent ?? generatedProduct?.title,
    }),
    [chatContext, currentCategory, generatedProduct?.title]
  );

  // bootstrap welcome message once
  useEffect(() => {
    if (chatMessages.length > 0) return;

    addChatMessage({
      type: "system",
      content: "Hi! I’m your AI assistant. Pick a workflow button below or tell me what you want to build.",
      suggestions: ["Create a pricing strategy", "Improve my product title", "Generate a new section", "Recommend components"],
    });
  }, [addChatMessage, chatMessages.length]);

  const sendUserText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // v1 guardrail: single tool call per message (enforced server-side later), but we still surface transparency.
    const toolPreview: ChatToolPreview = {
      mode: chatMode,
    };

    addChatMessage({ type: "user", content: trimmed });
    setChatLoading(true);
    setChatPhase("processing");

    try {
      // Phase: suggestions → implementation
      const phase = (chatPhase === "implementation" ? "implementation" : "suggestions") as "suggestions" | "implementation";

      // Prefer orchestrated flow (Ask/Turbo) when we have enough context.
      // Turbo will execute tool + format into ContentBlock; Ask will return a recommendation.
      const t0 = performance.now();
      const orchestrateRes = await postJson<any>("http://localhost:4000/api/chat/orchestrate", {
        message: trimmed,
        mode: chatMode,
        context: { category: resolvedContext.category, contentArea: resolvedContext.contentArea, currentContent: resolvedContext.currentContent },
        // Provide product+preset for Turbo formatting if available
        product: generatedProduct || undefined,
        preset: typeof activePresetIndex === 'number' ? presets?.[activePresetIndex] : undefined,
      });
      const t1 = performance.now();

      // Update tool preview transparency
      if (orchestrateRes?.recommendation) {
        toolPreview.serverId = orchestrateRes.recommendation.serverId;
        toolPreview.toolName = orchestrateRes.recommendation.toolName;
      }

      const traceId = orchestrateRes?.meta?.traceId;
      if (traceId) {
        useStore.getState().setLastTraceId(traceId);
      }

      if (orchestrateRes?.executed) {
        // Turbo: tool ran + formatted block returned.
        const formattedBlock = orchestrateRes?.formatted?.formattedBlock;
        const suggestions = orchestrateRes?.formatted?.suggestions?.map((s: any) => s.action).filter(Boolean);

        const debugEnabled = (() => {
          try {
            return new URLSearchParams(window.location.search).has('debugChat');
          } catch {
            return false;
          }
        })();

        addChatMessage({
          type: "assistant",
          content: `Executed ${orchestrateRes.recommendation?.serverId}:${orchestrateRes.recommendation?.toolName}. Preview is ready.`,
          suggestions,
          toolPreview: {
            ...toolPreview,
            serverLabel: orchestrateRes.recommendation?.serverId,
            args: debugEnabled ? orchestrateRes.recommendation?.args : undefined,
          },
        });

        if (debugEnabled) {
          addChatMessage({
            type: 'system',
            content: `debug: orchestrate ${(t1 - t0).toFixed(0)}ms • blockType=${orchestrateRes.recommendation?.targetBlockType}`,
          });
        }

        // Auto-push to canvas preview if we have a formatted block.
        if (formattedBlock) {
          const setPreviewBlock = useStore.getState().setPreviewBlock;
          setPreviewBlock(formattedBlock);
        }

        setChatPhase("completed");
        return;
      }

      // Ask: show recommendation and style follow-up options.
      const needsStyle = /pricing|gallery|calculator|showcase|testimonials?/i.test(trimmed);
      addChatMessage({
        type: "assistant",
        content: `Recommendation: ${orchestrateRes.recommendation?.serverId}:${orchestrateRes.recommendation?.toolName}. ${orchestrateRes.recommendation?.rationale || ''}`,
        options: needsStyle ? STYLE_OPTIONS : undefined,
        toolPreview,
      });

      setChatPhase("implementation");
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      addChatMessage({
        type: "assistant",
        content: `I hit an error processing that request. ${msg}`,
      });
      setChatPhase("suggestions");
    } finally {
      setChatLoading(false);
    }
  };

  const sendOption = async (opt: ChatOption) => {
    // Turn option into a natural language refinement.
    await sendUserText(`Use style: ${opt.label}.`);
  };

  return {
    chatMessages,
    isChatLoading,
    chatPhase,
    chatMode,
    resolvedContext,
    sendUserText,
    sendOption,
  };
}

function ChatTranscript({ onSuggestionClick, onOptionClick }: { onSuggestionClick: (s: string) => void; onOptionClick: (o: ChatOption) => void }) {
  const { chatMessages } = useStore();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length]);

  return (
    <div ref={scrollerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
      {chatMessages.map((message) => (
        <div
          key={message.id}
          className={cn("flex", message.type === "user" ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "max-w-[85%] rounded-lg p-3 text-sm",
              message.type === "user"
                ? "bg-black text-white"
                : message.type === "system"
                  ? "bg-purple-50 border border-purple-200"
                  : "bg-gray-100"
            )}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>

            {/* Tool transparency */}
            {message.toolPreview?.mode && (
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Mode: {message.toolPreview.mode === "turbo" ? "Turbo" : "Ask"}
                {message.toolPreview.serverLabel ? ` • ${message.toolPreview.serverLabel}` : ""}
                {message.toolPreview.toolName ? ` • ${message.toolPreview.toolName}` : ""}
              </div>
            )}

            {/* Legacy suggestions */}
            {message.suggestions?.length ? (
              <div className="mt-3 flex flex-col gap-2">
                {message.suggestions.slice(0, 6).map((s, idx) => (
                  <PromptSuggestion
                    key={idx}
                    className="w-full justify-start"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSuggestionClick(s)}
                  >
                    {s}
                  </PromptSuggestion>
                ))}
              </div>
            ) : null}

            {/* Structured options */}
            {message.options?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.options.map((opt) => (
                  <Button key={opt.value} size="sm" variant="secondary" onClick={() => onOptionClick(opt)}>
                    {opt.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatComposer({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const [value, setValue] = useState("");

  return (
    <div className="p-3 border-t border-gray-200">
      <PromptInput
        className="border-input bg-background border shadow-xs"
        value={value}
        onValueChange={setValue}
        onSubmit={() => {
          const v = value;
          setValue("");
          onSend(v);
        }}
      >
        <PromptInputTextarea />
        <div className="pointer-events-none absolute left-6 top-6 text-sm text-slate-400">
          Ask me anything or describe what you need...
        </div>
        <PromptInputActions className="justify-end">
          <Button
            size="sm"
            className="size-9 cursor-pointer rounded-full"
            onClick={() => {
              const v = value;
              setValue("");
              onSend(v);
            }}
            disabled={!value.trim() || disabled}
            aria-label="Send"
          >
            <ArrowUpIcon className="h-4 min-h-4 min-w-4 w-4" />
          </Button>
        </PromptInputActions>
      </PromptInput>
    </div>
  );
}

function AskTurboToggle({ mode, onChange }: { mode: ChatMode; onChange: (m: ChatMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-black/10 bg-white p-1">
      <button
        className={cn(
          "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md",
          mode === "ask" ? "bg-black text-white" : "text-slate-600 hover:bg-slate-50"
        )}
        onClick={() => onChange("ask")}
        type="button"
        aria-pressed={mode === "ask"}
      >
        Ask
      </button>
      <button
        className={cn(
          "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md",
          mode === "turbo"
            ? "bg-purple-600 text-white shadow-[0_0_0_2px_rgba(147,51,234,0.25)]"
            : "text-slate-600 hover:bg-slate-50"
        )}
        onClick={() => onChange("turbo")}
        type="button"
        aria-pressed={mode === "turbo"}
      >
        Turbo
      </button>
    </div>
  );
}

function ToolBrowser({ onUseTool }: { onUseTool: (toolName: string, serverId: string) => void }) {
  const {
    mcpStdioServersCache,
    fetchMcpStdioServers,
    fetchMcpStdioTools,
    mcpStdioToolsCache,
  } = useStore();

  const servers = mcpStdioServersCache?.servers || [];
  const [serverId, setServerId] = useState<string>(() => servers?.[0]?.id || 'magicui');

  useEffect(() => {
    if (servers.length && !servers.find((s) => s.id === serverId)) {
      setServerId(servers[0].id);
    }
  }, [servers, serverId]);

  const toolsObj = mcpStdioToolsCache[serverId]?.tools as any;
  const toolList: { name: string; description?: string }[] = toolsObj?.tools || [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          aria-label="Select MCP server"
          className="text-xs border border-black/20 rounded-lg px-2 py-1 bg-white"
          value={serverId}
          onChange={(e) => setServerId(e.target.value)}
        >
          {servers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (!servers.length) {
              fetchMcpStdioServers({ force: true }).catch(() => undefined);
              return;
            }
            fetchMcpStdioTools(serverId, { force: true }).catch(() => undefined);
          }}
          type="button"
        >
          Load tools
        </Button>
      </div>

      <div className="max-h-40 overflow-y-auto border border-black/10 rounded-lg" role="list" aria-label="MCP tools">
        {toolList.length ? (
          <ul className="divide-y divide-black/5">
            {toolList.slice(0, 30).map((t) => (
              <li key={t.name} className="p-2 flex items-start justify-between gap-2" role="listitem">
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">{t.name}</div>
                  {t.description ? <div className="text-[11px] text-slate-500 line-clamp-2">{t.description}</div> : null}
                </div>
                <Button size="sm" variant="ghost" onClick={() => onUseTool(t.name, serverId)} type="button" aria-label={`Use tool ${t.name}`}>
                  Use
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-2 text-[11px] text-slate-500">No tools loaded yet.</div>
        )}
      </div>

      {toolList.length > 30 ? <div className="text-[10px] text-slate-500">Showing first 30 tools.</div> : null}
    </div>
  );
}

function DebugTracePanel({ traceId }: { traceId: string | null }) {
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!traceId) {
      setText('No traceId captured yet. Run a chat orchestrate call in Ask/Turbo to generate one.');
      return;
    }

    const enabled = (() => {
      try {
        return new URLSearchParams(window.location.search).has('debugChat') || String(localStorage.getItem('AGENT_TRACE_ENABLED')) === 'true';
      } catch {
        return false;
      }
    })();

    if (!enabled) {
      setText('Tracing is disabled. Set AGENT_TRACE_ENABLED=true and reload, or add ?debugChat.');
      return;
    }

    setError('');
    fetch(`http://localhost:4000/api/traces/${traceId}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((t) => setText(t))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [traceId]);

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-white">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Debug Trace</div>
      {traceId ? <div className="text-[11px] text-slate-600 mb-2">traceId: <span className="font-mono">{traceId}</span></div> : null}
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
      <pre className="text-[11px] whitespace-pre-wrap break-words bg-slate-950 text-slate-50 rounded-lg p-3 overflow-x-auto">{text}</pre>
    </div>
  );
}

function WorkflowButtons({ category, onRun }: { category: WorkflowCategory; onRun: (prompt: string) => void }) {
  const buttons = WORKFLOW_BUTTONS[category];
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((b) => (
        <Button
          key={b.label}
          size="sm"
          variant="secondary"
          className="text-xs"
          onClick={() => onRun(b.prompt)}
          type="button"
        >
          {b.label}
        </Button>
      ))}
    </div>
  );
}

export function ChatControlDashboard() {
  const [dockLeftPx, setDockLeftPx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'assistant' | 'debug'>('assistant');
  const {
    chatDashboardHeightPx,
    setChatDashboardHeightPx,
    chatMode,
    setChatMode,
    chatDashboardCollapsed,
    setChatDashboardCollapsed,
    toggleChatDashboardCollapsed,
    currentCategory,
    fetchMcpStdioServers,
    mcpStdioServersCache,
    clearMcpToolCache,
    lastTraceId,
  } = useStore();

  const { isChatLoading, sendUserText, sendOption, resolvedContext } = useChatController();

  const [activeTab, setActiveTab] = useState<WorkflowCategory>(() => {
    const c = currentCategory || "AI_PROMPTS";
    return (String(c) as WorkflowCategory) in WORKFLOW_BUTTONS ? (String(c) as WorkflowCategory) : "AI_PROMPTS";
  });

  // Keep active tab in sync with currentCategory when user changes template category.
  useEffect(() => {
    const c = currentCategory || "AI_PROMPTS";
    if ((String(c) as WorkflowCategory) in WORKFLOW_BUTTONS) setActiveTab(String(c) as WorkflowCategory);
  }, [currentCategory]);

  // Hydrate persisted dashboard prefs on client mount
  useEffect(() => {
    try {
      const rawH = localStorage.getItem('gg_chatDashboardHeightPx');
      const n = rawH ? Number(rawH) : NaN;
      if (Number.isFinite(n)) setChatDashboardHeightPx(n);
    } catch {
      // ignore
    }

    try {
      const rawM = localStorage.getItem('gg_chatMode');
      if (rawM === 'turbo' || rawM === 'ask') setChatMode(rawM);
    } catch {
      // ignore
    }

    try {
      const rawC = localStorage.getItem('gg_chatDashboardCollapsed');
      if (rawC === 'true' || rawC === 'false') setChatDashboardCollapsed(rawC === 'true');
    } catch {
      // ignore
    }
  }, [setChatDashboardHeightPx, setChatMode, setChatDashboardCollapsed]);

  // Pre-fetch server list once (cached in store)
  useEffect(() => {
    fetchMcpStdioServers().catch(() => undefined);
  }, [fetchMcpStdioServers]);

  // Compute dock offset: snap to sidebar edge on desktop (ml-80 / w-80 => 320px)
  useEffect(() => {
    const update = () => setDockLeftPx(window.innerWidth >= 1024 ? 320 : 0);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Expand/collapse based on scroll threshold: expand only after user scrolls past the end of the main preview column.
  useEffect(() => {
    const el = document.getElementById('chat-preview-sentinel');
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // If sentinel is not intersecting and is above the viewport, we are past the preview.
        const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setIsExpanded(past);
        if (!past) setActiveRightTab('assistant');
      },
      { threshold: [0] }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Resize handle (expanded only)
  const draggingRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isOpen) return;
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isOpen) return;
    if (!draggingRef.current) return;
    const viewportH = window.innerHeight;
    const next = clamp(viewportH - e.clientY, 120, Math.floor(viewportH * 0.5));
    setChatDashboardHeightPx(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isOpen) return;
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const compactHeight = 72;
  const isOpen = isExpanded && !chatDashboardCollapsed;

  return (
    <div
      className="fixed bottom-0 right-0 z-40 border-t-2 border-black bg-white/95 backdrop-blur"
      style={{ height: isOpen ? chatDashboardHeightPx : compactHeight, left: dockLeftPx }}
      aria-label="Chat Control Dashboard"
    >
      {/* Resize handle (expanded only) */}
      {isOpen ? (
        <div
          className="h-3 cursor-ns-resize flex items-center justify-center"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize chat dashboard"
        >
          <div className="w-12 h-1.5 rounded-full bg-black/20" />
        </div>
      ) : null}

      {/* Compact sticky bar (always available) */}
      {!isOpen ? (
        <div className="h-full flex items-center gap-3 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-4 h-4 text-purple-600" />
            <div className="text-[10px] font-black uppercase tracking-[0.25em] truncate">Chat</div>
          </div>
          <div className="flex-1">
            <ChatComposer onSend={sendUserText} disabled={isChatLoading} />
          </div>
          <AskTurboToggle mode={chatMode} onChange={setChatMode} />
          <Button
            size="sm"
            variant="secondary"
            type="button"
            onClick={() => toggleChatDashboardCollapsed()}
            className="text-[10px] font-black uppercase tracking-widest"
            title="Expand/collapse chat dashboard"
          >
            Expand
          </Button>
        </div>
      ) : (
        <div className="h-[calc(100%-12px)] grid grid-cols-1 lg:grid-cols-12 gap-3 px-4 pb-3">
          {/* Left: workflows + controls */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-purple-600" />
              <div className="text-[10px] font-black uppercase tracking-[0.25em]">Chat Dashboard</div>
              <div className="text-[10px] font-bold text-slate-500">{categoryLabel(resolvedContext.category)}</div>
            </div>

            <div className="flex items-center gap-2">
              <AskTurboToggle mode={chatMode} onChange={setChatMode} />
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => toggleChatDashboardCollapsed()}
                className="text-[10px] font-black uppercase tracking-widest"
                title="Expand/collapse chat dashboard"
              >
                Collapse
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">MCP</div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                clearMcpToolCache();
                fetchMcpStdioServers({ force: true }).catch(() => undefined);
              }}
              type="button"
            >
              <RefreshCcw className="w-3 h-3 mr-2" />
              Refresh tools
            </Button>
            <div className="text-[10px] text-slate-500">
              {mcpStdioServersCache?.servers?.length ? `${mcpStdioServersCache.servers.length} servers cached` : "No servers cached"}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["AI_PROMPTS", "AI Prompts"],
                ["NOTION_TEMPLATES", "Notion"],
                ["DIGITAL_PLANNERS", "Planners"],
                ["DESIGN_TEMPLATES", "Design"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest",
                  activeTab === id ? "bg-black text-white border-black" : "bg-white border-black/20 text-slate-700 hover:bg-slate-50"
                )}
                onClick={() => setActiveTab(id)}
                aria-pressed={activeTab === id}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto rounded-xl border border-black/10 p-3 bg-white">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Workflow buttons</div>
            <WorkflowButtons category={activeTab} onRun={sendUserText} />
            <div className="mt-3 text-[11px] text-slate-600">
              Tip: click a workflow button → chat will ask follow-ups (like style) → then you can continue refining.
            </div>

            <div className="mt-4 border-t border-black/10 pt-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tool Browser (stdio)</div>
              <ToolBrowser onUseTool={(toolName, serverId) => sendUserText(`Use MCP tool ${serverId}:${toolName} to help with: ${resolvedContext.category || 'my product'}.`)} />
            </div>
          </div>
        </div>

          {/* Right: chat */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col rounded-xl border-2 border-black overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#ff90e8]" />
                <div className="text-[10px] font-black uppercase tracking-[0.25em]">Assistant</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border',
                    activeRightTab === 'assistant' ? 'bg-black text-white border-black' : 'border-black/20 text-slate-600 hover:bg-slate-50'
                  )}
                  onClick={() => setActiveRightTab('assistant')}
                >
                  Chat
                </button>
                <button
                  type="button"
                  className={cn(
                    'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border',
                    activeRightTab === 'debug' ? 'bg-black text-white border-black' : 'border-black/20 text-slate-600 hover:bg-slate-50'
                  )}
                  onClick={() => setActiveRightTab('debug')}
                >
                  Debug
                </button>
              </div>
            </div>

            {activeRightTab === 'assistant' ? (
              <>
                <ChatTranscript onSuggestionClick={sendUserText} onOptionClick={sendOption} />

                {isChatLoading ? (
                  <div className="px-3 py-2 text-xs text-slate-500 border-t border-gray-200">Thinking…</div>
                ) : null}

                <ChatComposer onSend={sendUserText} disabled={isChatLoading} />
              </>
            ) : (
              <DebugTracePanel traceId={lastTraceId} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatWithAI({ isOpen, onClose, context }: ChatWithAIProps) {
  const { isChatLoading, sendUserText, sendOption } = useChatController();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={cn(
          "bg-white rounded-xl shadow-xl border-2 border-black transition-all duration-300",
          isMinimized ? "w-80 h-16" : "w-[640px] h-[520px] max-h-[80vh]"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-500" />
            <span className="font-bold text-sm">Chat with AI</span>
            {context?.category ? (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{context.category.replace(/_/g, " ")}</span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized((v) => !v)}>
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized ? (
          <div className="flex flex-col h-[calc(520px-72px)]">
            <ChatTranscript onSuggestionClick={sendUserText} onOptionClick={sendOption} />
            {isChatLoading ? (
              <div className="px-4 py-2 text-xs text-slate-500 border-t border-gray-200">Thinking…</div>
            ) : null}
            <ChatComposer onSend={sendUserText} disabled={isChatLoading} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { ChatWithAI };
