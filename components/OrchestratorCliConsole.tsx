import React, { useEffect, useMemo, useRef, useState } from 'react';

type AgentId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type AgentDef = {
  id: AgentId;
  name: string;
  role: string;
  color: string; // tailwind text color
  bg: string; // tailwind bg
};

type Message = {
  id: string;
  ts: number;
  from: 'user' | 'agent';
  agentId?: AgentId;
  agentName?: string;
  text: string;
};

function nowId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function OrchestratorCliConsole() {
  const agents: AgentDef[] = useMemo(
    () => [
      { id: 1, name: 'Orchestrator', role: 'Pipeline controller (only agent allowed to fan-out to others)', color: 'text-blue-700', bg: 'bg-blue-50' },
      { id: 2, name: 'Content Director', role: 'Unified brief: goals/tone/pillars/section priorities', color: 'text-cyan-700', bg: 'bg-cyan-50' },
      { id: 3, name: 'Head Copywriter', role: 'Title/headline/PAS/features/CTA/guarantee/proof prompts', color: 'text-slate-700', bg: 'bg-slate-100' },
      { id: 4, name: 'Section Specialist', role: 'SectionSpecs (pricing/testimonials/FAQ/feature-grid/stats)', color: 'text-amber-700', bg: 'bg-amber-50' },
      { id: 5, name: 'Component Assembler (MCP)', role: 'Tool execution + formatting + fallbacks + glass injection', color: 'text-emerald-700', bg: 'bg-emerald-50' },
      { id: 6, name: 'Visual Stylist', role: 'Glass/light styling + layout rules (full-width pricing)', color: 'text-sky-700', bg: 'bg-sky-50' },
      { id: 7, name: 'QA Reviewer', role: 'Rubric scoring + quick fixes + console/a11y checks', color: 'text-red-700', bg: 'bg-red-50' },
      { id: 8, name: 'Publisher', role: 'Preview packaging + README + screenshots', color: 'text-slate-700', bg: 'bg-slate-50' },
    ],
    []
  );

  const [messages, setMessages] = useState<Message[]>([
    {
      id: nowId(),
      ts: Date.now(),
      from: 'agent',
      agentId: 1,
      agentName: 'Orchestrator',
      text:
        'Ready. Use /list to see agents. Use /1 ... to talk to Orchestrator (can fan-out). Use /2–/8 to talk to a single agent. If no prefix, defaults to /1.',
    },
  ]);
  const [input, setInput] = useState('');

  // Per-agent session isolation (RovoDev sessions)
  const sessionByAgentRef = useRef<Record<number, string>>({});

  // Right panel: status/usage
  const [statusText, setStatusText] = useState<string>('');
  const [usageText, setUsageText] = useState<string>('');

  function push(msg: Omit<Message, 'id' | 'ts'>) {
    setMessages((m) => [...m, { ...msg, id: nowId(), ts: Date.now() }]);
  }

  function renderAgentList() {
    const lines = agents
      .map((a) => `/${a.id} ${a.name} — ${a.role}`)
      .join('\n');
    push({ from: 'agent', agentId: 1, agentName: 'Orchestrator', text: `Agents:\n${lines}` });
  }

  function extractAssistantTextFromMaybeSse(text: string): string {
    // If `text` contains SSE frames, extract only the human-readable assistant deltas.
    // Expected nested frame example:
    // event: part_delta\n
    // data: {"index":0,"delta":{"content_delta":"Hello"},...}\n\n
    if (!text.includes('event:') || !text.includes('data:')) return '';

    const frames = text.split(/\n\n+/g).map((s) => s.trim()).filter(Boolean);
    const out: string[] = [];

    for (const frame of frames) {
      const lines = frame.split('\n');
      let dataLine = '';
      for (const line of lines) {
        if (line.startsWith('data:')) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;

      try {
        const payload = JSON.parse(dataLine);
        const deltaText = payload?.delta?.content_delta;
        if (typeof deltaText === 'string' && deltaText.length) out.push(deltaText);
      } catch {
        // ignore non-JSON data lines
      }
    }

    return out.join('');
  }

  async function streamRovoDev(
    requestPath: string,
    method: string,
    body: any | undefined,
    onChunk: (s: string) => void
  ) {
    const backendBase = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:4000';
    const resp = await fetch(`${backendBase}/api/rovodev/stream-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: requestPath, method, body }),
    });

    const reader = resp.body?.getReader();
    if (!reader) {
      onChunk(`(no response body; status=${resp.status})`);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    // Parse SSE frames from backend proxy
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // split on double newline boundaries
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const lines = part.split('\n');
        let event = 'message';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue;
        try {
          const payload = JSON.parse(data);
          if (event === 'chunk') {
            const chunkText = String(payload?.chunk ?? '');
            if (!chunkText) continue;

            // The upstream may itself be sending SSE frames (e.g., `event: part_delta`).
            // Extract human-readable assistant text deltas when present.
            const extracted = extractAssistantTextFromMaybeSse(chunkText);
            if (extracted) onChunk(extracted);
            else onChunk(chunkText);
          } else if (event === 'proxy.error') {
            onChunk(`\n[proxy.error] ${payload?.error ?? 'unknown error'}\n`);
          } else if (event === 'proxy.response') {
            onChunk(`\n[proxy.response] status=${payload?.status}\n`);
          }
        } catch {
          // if not JSON, still surface
          onChunk(data);
        }
      }
    }
  }

  async function fetchRovoDevJson<T>(requestPath: string, method: string, body?: any): Promise<T> {
    const backendBase = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:4000';
    const resp = await fetch(`${backendBase}/api/rovodev/stream-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: requestPath, method, body: body ?? null }),
    });
    const text = await resp.text();
    // stream-proxy returns SSE. For JSON endpoints, the first chunk contains full JSON.
    // We'll parse by extracting the first data chunk if possible.
    const match = text.match(/event: chunk\s+data: (\{.*\})/s);
    if (match) {
      const payload = JSON.parse(match[1]);
      const raw = String(payload?.chunk ?? '');
      return JSON.parse(raw) as T;
    }
    // Fallback: try direct JSON parse
    return JSON.parse(text) as T;
  }

  async function ensureSession(agentId: AgentId): Promise<string> {
    const existing = sessionByAgentRef.current[agentId];
    if (existing) return existing;
    const created = await fetchRovoDevJson<{ session_id: string }>(
      '/v3/sessions/create',
      'POST',
      { custom_title: `StudioGlass /${agentId}` }
    );
    sessionByAgentRef.current[agentId] = created.session_id;
    return created.session_id;
  }

  async function restoreSession(sessionId: string) {
    await fetchRovoDevJson('/v3/sessions/' + sessionId + '/restore', 'POST');
  }

  function agentIdToSubagentName(id: AgentId) {
    switch (id) {
      case 1: return 'Orchestrator';
      case 2: return 'Content Director';
      case 3: return 'Head Copywriter';
      case 4: return 'Section-Specialist';
      case 5: return 'Component Assembler';
      case 6: return 'Visual Stylist';
      case 7: return 'QA Reviewer';
      case 8: return 'Publisher';
    }
  }

  function rolePrefix(agentId: AgentId) {
    // Hard constraints injected into every message to enforce correct role behavior.
    // Keep short to reduce token waste.
    switch (agentId) {
      case 1:
        return (
          'SYSTEM: You are /1 Orchestrator. You are the only agent allowed to fan-out. ' +
          'When asked to run a workflow, coordinate /2–/8 internally and present results. ' +
          'Prefer concise bullet plans and deterministic outputs.\n'
        );
      case 2:
        return (
          'SYSTEM: You are /2 Content Director. Output STRICT JSON only: {"brief":{...}}. ' +
          'No fan-out. No tool calls. Outcome-first. Light/glass directives.\n'
        );
      case 3:
        return (
          'SYSTEM: You are /3 Head Copywriter. Output STRICT JSON only: {"copy":{title,headline,descriptionPAS,features[],benefitBullets[],cta,guarantee,proofPrompts[]}}. ' +
          'No fan-out. No tool calls. No placeholders.\n'
        );
      case 4:
        return (
          'SYSTEM: You are /4 Section Specialist. Output STRICT JSON only: {"sectionSpecs":[...]} with MCP mapping fields. ' +
          'Pricing must be fullWidth:true. No fan-out.\n'
        );
      case 5:
        return (
          'SYSTEM: You are /5 Component Assembler (MCP). Output STRICT JSON only: {assembled,insertedCount,fallbacksUsed,product}. ' +
          'Generate pricing/testimonials/faq/feature-grid/stats using MCP servers; use fallbacks if needed. No fan-out.\n'
        );
      case 6:
        return (
          'SYSTEM: You are /6 Visual Stylist. Output STRICT JSON only: {styled:true,notes:[...],enforced:{pricingFullWidth:boolean,glass:boolean}}. ' +
          'No fan-out.\n'
        );
      case 7:
        return (
          'SYSTEM: You are /7 QA Reviewer. Output STRICT JSON only: {qa:{score,breakdown,notes,quickFixApplied}} using the scoring rubric. No fan-out.\n'
        );
      case 8:
        return (
          'SYSTEM: You are /8 Publisher. Output STRICT JSON only: {deliverablePreview,filesGenerated[],warnings[]}. No fan-out.\n'
        );
    }
  }

  function commandHelp() {
    return [
      '/list — show agents',
      '/reset — reset RovoDev session state',
      '/cancel — cancel current stream',
      '/status — show model + server status',
      '/usage — show token usage',
      '/1 ... — orchestrator (may fan-out)',
      '/2..../8 ... — single-agent messages',
    ].join('\n');
  }

  async function callJsonEndpoint(path: string, method: string, body: any | undefined, append: (c: string) => void) {
    append(`\n[call] ${method} ${path}\n`);
    await streamRovoDev(path, method, body, (c) => append(c));
  }

  // Poll status/usage for the right panel
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const backendBase = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:4000';
        const envRes = await fetch(`${backendBase}/api/rovodev/env-status`);
        const envJson = await envRes.json();
        if (!envJson?.tokenPresent) return;

        const statusChunks: string[] = [];
        await streamRovoDev('/v3/status', 'GET', undefined, (c) => statusChunks.push(c));
        const usageChunks: string[] = [];
        await streamRovoDev('/v3/usage', 'GET', undefined, (c) => usageChunks.push(c));

        if (!cancelled) {
          setStatusText(statusChunks.join('').trim());
          setUsageText(usageChunks.join('').trim());
        }
      } catch {
        // ignore
      }
    };

    tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  async function handleSend(raw: string) {
    const text = raw.trim();
    if (!text) return;

    push({ from: 'user', text });

    if (text === '/list') {
      renderAgentList();
      return;
    }

    if (text === '/help') {
      push({ from: 'agent', agentId: 1, agentName: 'Orchestrator', text: commandHelp() });
      return;
    }

    // Slash commands that map directly to RovoDev OpenAPI
    if (text === '/reset' || text === '/cancel' || text === '/status' || text === '/usage') {
      const msgId = nowId();
      setMessages((prev) => [
        ...prev,
        { id: msgId, ts: Date.now(), from: 'agent', agentId: 1, agentName: 'Orchestrator', text: '' },
      ]);
      const append = (chunk: string) => setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: (m.text || '') + chunk } : m)));

      if (text === '/reset') return void callJsonEndpoint('/v3/reset', 'POST', {}, append);
      if (text === '/cancel') return void callJsonEndpoint('/v3/cancel', 'POST', {}, append);
      if (text === '/status') return void callJsonEndpoint('/v3/status', 'GET', undefined, append);
      if (text === '/usage') return void callJsonEndpoint('/v3/usage', 'GET', undefined, append);
    }

    // Special local backend orchestration (server-side /1 envelope)
    // Usage: /orchestrate <message>
    if (text.startsWith('/orchestrate ')) {
      const payload = text.slice('/orchestrate '.length).trim();
      const msgId = nowId();
      setMessages((prev) => [
        ...prev,
        { id: nowId(), ts: Date.now(), from: 'user', text },
        { id: msgId, ts: Date.now(), from: 'agent', agentId: 1, agentName: 'Orchestrator', text: '' },
      ]);
      const append = (chunk: string) =>
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: (m.text || '') + chunk } : m)));

      try {
        append('[api] POST /api/agents/orchestrate\n');
        const r = await fetch('http://localhost:4000/api/agents/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: payload, context: {}, mode: 'fast' }),
        });
        const json = await r.json();
        append(JSON.stringify(json, null, 2));
      } catch (e) {
        append(`\n[error] ${String((e as any)?.message ?? e)}\n`);
      }
      return;
    }

    // Default to /1
    const m = text.match(/^\/(\d)\s+([\s\S]+)$/);
    const agentId: AgentId = (m ? Number(m[1]) : 1) as AgentId;
    const payload = m ? m[2].trim() : text;
    const agent = agents.find((a) => a.id === agentId) ?? agents[0];

    // Create a streaming placeholder message we will append into
    const msgId = nowId();
    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        ts: Date.now(),
        from: 'agent',
        agentId,
        agentName: agent.name,
        text: '',
      },
    ]);

    const append = (chunk: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: (m.text || '') + chunk } : m))
      );
    };

    // Ensure per-agent session isolation by restoring the agent's dedicated session
    try {
      const sid = await ensureSession(agentId);
      await restoreSession(sid);
    } catch (e) {
      // Non-fatal; continue without isolation
      append(`\n[session] warning: could not ensure session isolation (${String((e as any)?.message ?? e)})\n`);
    }

    // Minimal wiring: try common RovoDev endpoints.
    // We can safely start with /healthcheck for "ping" commands.
    // For actual subagent invocation, we send to /chat with a structured message.
    const isPing = payload === 'ping' || payload === 'health' || payload === 'healthcheck';
    if (isPing) {
      await streamRovoDev('/healthcheck', 'GET', undefined, append);
      return;
    }

    // RovoDev Serve API (OpenAPI v3):
    // 1) POST /v3/set_chat_message with { message, context, enable_deep_plan }
    // 2) GET  /v3/stream_chat to stream the response as text/event-stream
    await streamRovoDev(
      '/v3/set_chat_message',
      'POST',
      {
        message: rolePrefix(agentId) + payload,
        context: [],
        enable_deep_plan: false,
      },
      (chunk) => append(chunk)
    );

    append('\n\n[stream] --- streaming response ---\n');

    // Stream response (SSE) and append live deltas
    await streamRovoDev('/v3/stream_chat?enable_deferred_tools=false', 'GET', undefined, append);
  }

  return (
    <div className="w-full min-h-[calc(100vh-24px)] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Orchestrator CLI Console</div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">/1–/8 Agent Router</h1>
            <p className="text-sm text-slate-600">Use /list. Default agent is /1 Orchestrator.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="p-4 border-b border-white/60">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">Chat</div>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-auto">
              {messages.map((msg) => {
                const agentDef = msg.agentId ? agents.find((a) => a.id === msg.agentId) : undefined;
                const isUser = msg.from === 'user';
                return (
                  <div key={msg.id} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={
                        'max-w-[90%] rounded-2xl px-4 py-3 border ' +
                        (isUser
                          ? 'bg-slate-900 text-white border-slate-900'
                          : `${agentDef?.bg ?? 'bg-white'} ${agentDef?.color ?? 'text-slate-900'} border-white/60`)
                      }
                    >
                      {!isUser && (
                        <div className="text-[11px] font-black uppercase tracking-widest opacity-70">
                          {msg.agentId ? `/${msg.agentId} ${msg.agentName}` : msg.agentName}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/60">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = input;
                  setInput('');
                  void handleSend(v);
                }}
              >
                <input
                  className="flex-1 rounded-xl border border-white/60 bg-white/70 backdrop-blur px-3 py-2 text-sm outline-none"
                  placeholder="Try: /list   or   /orchestrate Create a pricing section"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-xl px-4 py-2 text-sm font-black bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="p-4 border-b border-white/60">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">Agents</div>
            </div>
            <div className="p-4 space-y-2">
              {agents.map((a) => (
                <div key={a.id} className={`rounded-xl border border-white/60 ${a.bg} px-3 py-2`}>
                  <div className={`text-xs font-black uppercase tracking-widest ${a.color}`}>/{a.id} {a.name}</div>
                  <div className="text-xs text-slate-600">{a.role}</div>
                </div>
              ))}
              <div className="pt-2 text-xs text-slate-600">Sessions are isolated per /1–/8 using RovoDev sessions.</div>
            </div>

            <div className="p-4 border-t border-white/60">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">RovoDev Status</div>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700 max-h-[160px] overflow-auto">{statusText || '(no status yet)'}</pre>
              <div className="mt-3 text-xs font-black uppercase tracking-widest text-slate-500">RovoDev Usage</div>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700 max-h-[160px] overflow-auto">{usageText || '(no usage yet)'}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
