type GumroadTokenResponse = {
  access_token: string;
  token_type?: string;
  scope?: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const GUMROAD_AUTHORIZE_URL = 'https://gumroad.com/oauth/authorize';
const GUMROAD_TOKEN_URL = 'https://api.gumroad.com/oauth/token';
const GUMROAD_API_BASE = 'https://api.gumroad.com/v2';

// NOTE: in-memory token storage is for local dev/testing only.
// TODO: persist this using Prisma + database for multi-user / production.
let accessToken: string | null = null;

export function isConnectedToGumroad(): boolean {
  return Boolean(accessToken);
}

export function clearGumroadToken() {
  accessToken = null;
}

export function setGumroadToken(token: string) {
  accessToken = token;
}

export function getGumroadAuthUrl(state?: string) {
  const clientId = requireEnv('GUMROAD_CLIENT_ID');
  const redirectUri = requireEnv('GUMROAD_REDIRECT_URI');

  const url = new URL(GUMROAD_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');

  if (state) url.searchParams.set('state', state);

  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = requireEnv('GUMROAD_CLIENT_ID');
  const clientSecret = requireEnv('GUMROAD_CLIENT_SECRET');
  const redirectUri = requireEnv('GUMROAD_REDIRECT_URI');

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('redirect_uri', redirectUri);

  const res = await fetch(GUMROAD_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as GumroadTokenResponse;
  if (!json.access_token) {
    throw new Error('Token exchange succeeded but no access_token returned');
  }

  setGumroadToken(json.access_token);
  return json.access_token;
}

export type CreateGumroadProductInput = {
  name: string;
  price: number; // USD
  description?: string;
  // Optional future: tags, cover_image, preview, etc.
};

export type CreateGumroadProductResult = {
  id: string;
  url: string;
};

export async function createGumroadProduct(input: CreateGumroadProductInput): Promise<CreateGumroadProductResult> {
  if (!accessToken) throw new Error('Not connected to Gumroad');

  // Gumroad expects price in cents.
  const priceCents = Math.max(0, Math.round(input.price * 100));

  const body = new URLSearchParams();
  body.set('access_token', accessToken);
  body.set('name', input.name);
  body.set('price', String(priceCents));
  if (input.description) body.set('description', input.description);

  const res = await fetch(`${GUMROAD_API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'GumGenieProAI/1.0 (+local-dev)',
    },
    body,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`Create product failed (${res.status}): ${JSON.stringify(json)}`);
  }

  // Gumroad response shape: { success: true, product: { id, short_url, url, ... } }
  const data = json as any;
  const product = data?.product as any;
  const id = product?.id as string | undefined;
  const url = (product?.short_url || product?.url) as string | undefined;

  if (!id || !url) {
    throw new Error(`Unexpected create product response: ${JSON.stringify(json)}`);
  }

  return { id, url };
}
