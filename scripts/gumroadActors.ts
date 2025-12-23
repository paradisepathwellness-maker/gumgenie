import './loadEnvLocal';

function requireEnv(name: string, fallbacks: string[] = []) {
  const candidates = [name, ...fallbacks];
  for (const k of candidates) {
    const v = process.env[k];
    if (v) return v;
  }
  throw new Error(`Missing required env var: ${name}`);
}

export const gumroadActors = {
  search: process.env.APIFY_GUMROAD_SEARCH_ACTOR_ID || 'easyapi/gumroad-search-scraper',
  detail: process.env.APIFY_GUMROAD_DETAIL_ACTOR_ID || 'muhammetakkurtt/gumroad-scraper',
  reviews: process.env.APIFY_GUMROAD_REVIEWS_ACTOR_ID || 'easyapi/gumroad-reviews-scraper',
};

export function apifyToken() {
  return requireEnv('APIFY_TOKEN');
}

export async function apifyRunActor(actorId: string, input: any): Promise<{ defaultDatasetId: string; raw: any }> {
  const token = apifyToken();
  const res = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(token)}&waitForFinish=180`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  const txt = await res.text();
  if (!res.ok) throw new Error(`Apify run failed (${res.status}) for ${actorId}: ${txt}`);
  const json = JSON.parse(txt);
  const datasetId = json?.data?.defaultDatasetId;
  if (!datasetId) throw new Error(`Apify response missing defaultDatasetId for ${actorId}: ${txt}`);
  return { defaultDatasetId: datasetId, raw: json };
}

export async function apifyFetchDataset(datasetId: string): Promise<any[]> {
  const token = apifyToken();
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=true&format=json`
  );
  const txt = await res.text();
  if (!res.ok) throw new Error(`Apify dataset fetch failed (${res.status}): ${txt}`);
  return JSON.parse(txt);
}
