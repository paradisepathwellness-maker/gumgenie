import { getSessionIdFromRequest, getNotionToken } from '../../_lib/session';
import { newRunId, nowIso, jsonResponse, okEnvelope } from '../../_lib/provenance';

type Env = {
  GG_SESSION_KV?: any;
};

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  const runId = newRunId('notionStatus');
  const startedAt = nowIso();

  const sid = getSessionIdFromRequest(request);
  if (!sid) {
    return jsonResponse(okEnvelope({ runId, startedAt, data: { connected: false } }), { status: 200 });
  }

  try {
    const token = await getNotionToken({ GG_SESSION_KV: env.GG_SESSION_KV }, sid);
    return jsonResponse(okEnvelope({ runId, startedAt, data: { connected: Boolean(token) } }), { status: 200 });
  } catch (e: any) {
    return jsonResponse(okEnvelope({ runId, startedAt, data: { connected: false, error: e?.message || String(e) } }), { status: 200 });
  }
}
