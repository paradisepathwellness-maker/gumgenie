// Cloudflare Pages Function: /api/verify
// Verifies a Gumroad license key.
//
// Required env vars (Cloudflare):
// - GUMROAD_PRODUCT_PERMALINK
// - (optional) GUMROAD_ACCESS_TOKEN
//
// NOTE: This is a minimal v1. We will add one-time redemption storage (KV/D1) next.

// Minimal KV type shim to keep this repo dependency-free.
// Cloudflare Pages will provide the real KVNamespace binding at runtime.
type KVNamespace = {
  get: (key: string) => Promise<string | null>;
  put?: (key: string, value: string, options?: unknown) => Promise<void>;
};

type Env = {
  GUMROAD_PRODUCT_PERMALINK?: string;
  GUMROAD_ACCESS_TOKEN?: string;
  // KV binding (Cloudflare Pages): used to track redeemed license keys
  GG_LICENSE_KV?: KVNamespace;
};

import { newRunId, nowIso, jsonResponse, errEnvelope, okEnvelope } from '../_lib/provenance';

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  const runId = newRunId('verify');
  const startedAt = nowIso();

  const body = await request.json().catch(() => null);
  const licenseKey = body?.licenseKey ? String(body.licenseKey).trim() : '';

  if (!licenseKey) {
    return jsonResponse({ ...errEnvelope({ runId, startedAt, error: 'missing_license_key' }), valid: false, reason: 'missing_license_key' }, { status: 400 });
  }

  if (!env.GUMROAD_PRODUCT_PERMALINK) {
    return jsonResponse(
      { ...errEnvelope({ runId, startedAt, error: 'missing_env', message: 'Missing required env var: GUMROAD_PRODUCT_PERMALINK' }), valid: false, reason: 'missing_env' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams();
  params.set('product_permalink', env.GUMROAD_PRODUCT_PERMALINK);
  params.set('license_key', licenseKey);

  // If you use a Gumroad API token, include it (some endpoints can require auth depending on settings).
  if (env.GUMROAD_ACCESS_TOKEN) params.set('access_token', env.GUMROAD_ACCESS_TOKEN);

  const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  // Expected response: { success: boolean, purchase: {...} }
  const success = Boolean(json?.success);
  const purchase = json?.purchase;
  const refunded = Boolean(purchase?.refunded);
  const chargebacked = Boolean(purchase?.chargebacked);

  if (success && !refunded && !chargebacked) {
    // One-time redemption check (do NOT mark used here; mark in /api/generate after successful build)
    if (env.GG_LICENSE_KV) {
      const used = await env.GG_LICENSE_KV.get(`used:${licenseKey}`);
      if (used) {
        return jsonResponse({ ...errEnvelope({ runId, startedAt, error: 'used' }), valid: false, reason: 'used' }, { status: 403 });
      }
    }

    return jsonResponse({ ...okEnvelope({ runId, startedAt }), valid: true }, { status: 200 });
  }

  const reason = refunded ? 'refunded' : chargebacked ? 'chargebacked' : 'invalid';
  return jsonResponse({ ...errEnvelope({ runId, startedAt, error: reason }), valid: false, reason }, { status: 403 });
}
