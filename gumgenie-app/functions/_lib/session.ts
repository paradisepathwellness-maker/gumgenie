// Shared helpers for Cloudflare Pages Functions

// Minimal KV type shim (no dependency on Cloudflare types)
export type KVNamespace = {
  get: (key: string) => Promise<string | null>;
  put?: (key: string, value: string, options?: unknown) => Promise<void>;
};

export type EnvWithSessionKv = {
  GG_SESSION_KV?: KVNamespace;
};

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const [kRaw, ...rest] = p.trim().split('=');
    if (!kRaw) continue;
    out[kRaw] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

export function getSessionIdFromRequest(req: Request): string | null {
  const cookies = parseCookies(req.headers.get('cookie'));
  return cookies.gg_sid || null;
}

export function newSessionId(): string {
  try {
    // Cloudflare runtime supports crypto.randomUUID
    // eslint-disable-next-line no-undef
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}

export function sessionCookieHeader(sessionId: string): string {
  // Strict-ish defaults; adjust once we lock deployment.
  // SameSite=Lax allows OAuth redirect flows.
  return `gg_sid=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

export async function storeNotionToken(env: EnvWithSessionKv, sessionId: string, token: unknown) {
  if (!env.GG_SESSION_KV?.put) throw new Error('Missing KV binding: GG_SESSION_KV (put)');
  await env.GG_SESSION_KV.put(`sid:${sessionId}:notionToken`, JSON.stringify(token));
}

export async function getNotionToken(env: EnvWithSessionKv, sessionId: string): Promise<string | null> {
  if (!env.GG_SESSION_KV) throw new Error('Missing KV binding: GG_SESSION_KV');
  const raw = await env.GG_SESSION_KV.get(`sid:${sessionId}:notionToken`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const tok = parsed?.access_token;
    return typeof tok === 'string' ? tok : null;
  } catch {
    return null;
  }
}
