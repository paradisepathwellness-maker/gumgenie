// Shared Gumroad verification helper for Cloudflare Functions

export type GumroadVerifyResult =
  | { valid: true }
  | { valid: false; reason: 'invalid' | 'refunded' | 'chargebacked' | 'gumroad_error' | 'missing_env'; message?: string };

export async function verifyGumroadLicense(params: {
  licenseKey: string;
  productPermalink?: string;
  accessToken?: string;
}): Promise<GumroadVerifyResult> {
  const { licenseKey, productPermalink, accessToken } = params;

  if (!productPermalink) {
    return { valid: false, reason: 'missing_env', message: 'Missing required env var: GUMROAD_PRODUCT_PERMALINK' };
  }

  const body = new URLSearchParams();
  body.set('product_permalink', productPermalink);
  body.set('license_key', licenseKey);
  if (accessToken) body.set('access_token', accessToken);

  const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text().catch(() => '');
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  const success = Boolean(json?.success);
  const purchase = json?.purchase;
  const refunded = Boolean(purchase?.refunded);
  const chargebacked = Boolean(purchase?.chargebacked);

  if (success && !refunded && !chargebacked) return { valid: true };

  if (refunded) return { valid: false, reason: 'refunded' };
  if (chargebacked) return { valid: false, reason: 'chargebacked' };

  // If Gumroad is down or we got a non-JSON response, treat as transient.
  if (!json) return { valid: false, reason: 'gumroad_error' };

  return { valid: false, reason: 'invalid' };
}
