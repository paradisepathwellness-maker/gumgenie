import { TemplateCategory } from '../types';

export type MarketTopProduct = {
  title: string;
  url: string;
  price?: number;
};

export type MarketBrief = {
  query: string;
  category?: TemplateCategory;
  fetchedAt: string;
  topProducts: MarketTopProduct[];
  keywordSuggestions: string[];
  pricing: {
    min?: number;
    max?: number;
    median?: number;
    sampleSize: number;
  };
};

const cache = new Map<string, { expiresAt: number; value: MarketBrief }>();

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => t.length >= 3);
}

const STOPWORDS = new Set([
  'the','and','for','with','your','you','a','an','to','of','in','on','at','from','by','this','that','these','those','pack','bundle','kit','template','templates','notion','ai','digital'
]);

function extractKeywords(titles: string[], limit = 12): string[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const tok of tokenize(title)) {
      if (STOPWORDS.has(tok)) continue;
      counts.set(tok, (counts.get(tok) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

function median(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Best-effort Gumroad scraping. Gumroad HTML is not a stable API.
export async function fetchMarketBrief(params: { query: string; category?: TemplateCategory }): Promise<MarketBrief> {
  const q = normalizeQuery(params.query);
  if (!q) throw new Error('query is required');

  const cacheKey = `${q}::${params.category || 'any'}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = new URL('https://gumroad.com/discover');
  url.searchParams.set('query', q);

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'GumGenieProAI/1.0 (+market-brief; local-dev)',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch Gumroad discover (${res.status}): ${text.slice(0, 300)}`);
  }

  const html = await res.text();

  // Heuristic extraction: find /l/<slug> links (absolute or relative; single or double quotes)
  // Gumroad's HTML is not stable; keep this tolerant.
  const foundLinks = new Set<string>();

  const hrefRegex = /href\s*=\s*['"](?:(?:https?:\/\/)?gumroad\.com)?(\/l\/[a-zA-Z0-9_-]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    foundLinks.add(match[1]);
    if (foundLinks.size >= 50) break;
  }

  // Fallback: raw scan for "/l/<slug>" even if not inside href
  if (foundLinks.size < 5) {
    const rawRegex = /\/l\/[a-zA-Z0-9_-]+/g;
    const rawMatches = html.match(rawRegex) || [];
    for (const m of rawMatches) {
      foundLinks.add(m);
      if (foundLinks.size >= 50) break;
    }
  }

  const topProducts: MarketTopProduct[] = [...foundLinks].slice(0, 12).map((path) => {
    const slug = path.split('/').pop() || path;
    return {
      title: slug.replace(/[-_]/g, ' '),
      url: `https://gumroad.com${path}`,
    };
  });

  const keywordSuggestions = extractKeywords(topProducts.map((p) => p.title));

  // Prices are not reliably present in HTML; placeholder until we add deeper extraction.
  const prices = topProducts.map((p) => p.price).filter((p): p is number => typeof p === 'number');

  const brief: MarketBrief = {
    query: q,
    category: params.category,
    fetchedAt: new Date().toISOString(),
    topProducts,
    keywordSuggestions,
    pricing: {
      min: prices.length ? Math.min(...prices) : undefined,
      max: prices.length ? Math.max(...prices) : undefined,
      median: median(prices),
      sampleSize: prices.length,
    },
  };

  cache.set(cacheKey, { expiresAt: Date.now() + 1000 * 60 * 30, value: brief });
  return brief;
}
