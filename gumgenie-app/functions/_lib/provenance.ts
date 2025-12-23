export function newRunId(prefix = 'run') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

// NOTE: Use `any` for init to avoid depending on DOM lib types in lint/runtime.
export function jsonResponse(body: unknown, init?: any) {
  return new Response(JSON.stringify(body), {
    ...(init || {}),
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

export function okEnvelope<T>(params: { runId: string; startedAt: string; data?: T }) {
  return { ok: true, runId: params.runId, startedAt: params.startedAt, ...(params.data ? params.data : {}) };
}

export function errEnvelope(params: { runId: string; startedAt: string; error: string; message?: string; details?: unknown }) {
  const out: any = { ok: false, runId: params.runId, startedAt: params.startedAt, error: params.error };
  if (params.message) out.message = params.message;
  if (params.details !== undefined) out.details = params.details;
  return out;
}
