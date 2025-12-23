type NotionTokenResponse = {
  access_token: string;
  token_type?: string;
  bot_id?: string;
  workspace_id?: string;
  workspace_name?: string;
  owner?: unknown;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// Notion OAuth endpoints
const NOTION_AUTHORIZE_URL = 'https://api.notion.com/v1/oauth/authorize';
const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

// NOTE: in-memory token storage is for local dev/testing only.
// TODO: persist using database for multi-user / production.
let accessToken: string | null = null;

export function isConnectedToNotion(): boolean {
  return Boolean(accessToken);
}

export function clearNotionToken() {
  accessToken = null;
}

export function setNotionToken(token: string) {
  accessToken = token;
}

export function getNotionToken(): string | null {
  return accessToken;
}

export function getNotionAuthUrl(state?: string) {
  const clientId = requireEnv('NOTION_CLIENT_ID');
  const redirectUri = requireEnv('NOTION_REDIRECT_URI');

  const url = new URL(NOTION_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  if (state) url.searchParams.set('state', state);

  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = requireEnv('NOTION_CLIENT_ID');
  const clientSecret = requireEnv('NOTION_CLIENT_SECRET');
  const redirectUri = requireEnv('NOTION_REDIRECT_URI');

  // Notion expects Basic auth. Some gateways are strict about form-encoding.
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', redirectUri);

  const res = await fetch(NOTION_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Avoid leaking any sensitive info; keep only a short snippet.
    const snippet = String(text || '').slice(0, 500);
    try {
      const parsed = JSON.parse(snippet);
      const err = parsed?.error ? String(parsed.error) : 'oauth_error';
      const reqId = parsed?.request_id ? String(parsed.request_id) : undefined;
      throw new Error(`Notion token exchange failed (${res.status}): ${err}${reqId ? ` (request_id=${reqId})` : ''}`);
    } catch {
      throw new Error(`Notion token exchange failed (${res.status}): ${snippet}`);
    }
  }

  const json = (await res.json()) as NotionTokenResponse;
  if (!json.access_token) {
    throw new Error('Notion token exchange succeeded but no access_token returned');
  }

  setNotionToken(json.access_token);
  return json.access_token;
}
