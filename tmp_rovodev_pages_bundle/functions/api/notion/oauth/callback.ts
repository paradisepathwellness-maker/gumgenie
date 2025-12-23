import { getSessionIdFromRequest, sessionCookieHeader, storeNotionToken } from '../../../_lib/session';
import { newRunId, nowIso, jsonResponse, errEnvelope, okEnvelope } from '../../../_lib/provenance';

type Env = {
  NOTION_CLIENT_ID?: string;
  NOTION_CLIENT_SECRET?: string;
  NOTION_REDIRECT_URI?: string;
  GG_SESSION_KV?: any;
};

type NotionTokenResponse = {
  access_token: string;
  token_type?: string;
  bot_id?: string;
  workspace_id?: string;
  workspace_name?: string;
};

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  const runId = newRunId('notionOAuth');
  const startedAt = nowIso();

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const debug = url.searchParams.get('debug') === '1';

  if (!code) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'missing_code' }), { status: 400 });
  }

  const clientId = env.NOTION_CLIENT_ID;
  const clientSecret = env.NOTION_CLIENT_SECRET;
  const redirectUri = env.NOTION_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return jsonResponse(
      errEnvelope({ runId, startedAt, error: 'missing_env', message: 'Missing NOTION_CLIENT_ID/NOTION_CLIENT_SECRET/NOTION_REDIRECT_URI' }),
      { status: 500 }
    );
  }

  // Prefer sid from state (OAuth roundtrip). Fallback to cookie.
  const sid = state || getSessionIdFromRequest(request);
  if (!sid) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'missing_session' }), { status: 400 });
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', redirectUri);

  const res = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  const txt = await res.text().catch(() => '');
  if (!res.ok) {
    const snippet = String(txt).slice(0, 500);
    if (debug) {
      return jsonResponse(errEnvelope({ runId, startedAt, error: 'token_exchange_failed', details: snippet }), { status: 400 });
    }

    return new Response(null, {
      status: 302,
      headers: { location: `/activate.html?notion=error` },
    });
  }

  const tokenJson = JSON.parse(txt) as NotionTokenResponse;
  await storeNotionToken({ GG_SESSION_KV: env.GG_SESSION_KV }, sid, tokenJson);

  if (debug) {
    return jsonResponse(okEnvelope({ runId, startedAt, data: { connected: true, workspace: tokenJson.workspace_name || null } }), {
      status: 200,
      headers: { 'set-cookie': sessionCookieHeader(sid) },
    });
  }

  return new Response(null, {
    status: 302,
    headers: { location: `/activate.html?notion=connected`, 'set-cookie': sessionCookieHeader(sid) },
  });
}
