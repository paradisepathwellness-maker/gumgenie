import { getSessionIdFromRequest, newSessionId, sessionCookieHeader } from '../../../_lib/session';

type Env = {
  NOTION_CLIENT_ID?: string;
  NOTION_REDIRECT_URI?: string;
};

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  const clientId = env.NOTION_CLIENT_ID;
  const redirectUri = env.NOTION_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing_env', message: 'Missing NOTION_CLIENT_ID or NOTION_REDIRECT_URI' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  const existingSid = getSessionIdFromRequest(request);
  const sid = existingSid || newSessionId();

  const url = new URL('https://api.notion.com/v1/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  // Round-trip sid via state so callback can map token to session.
  url.searchParams.set('state', sid);

  const headers = new Headers();
  headers.set('location', url.toString());
  if (!existingSid) headers.set('set-cookie', sessionCookieHeader(sid));

  return new Response(null, { status: 302, headers });
}
