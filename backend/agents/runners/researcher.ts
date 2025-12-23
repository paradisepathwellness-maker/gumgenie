import fs from 'node:fs/promises';
import path from 'node:path';

import type { TemplateCategory } from '../../../types';
import type { ResearchData } from '../definitions/schemas';
import { loadSnapshot, saveSnapshot } from '../utils/snapshots';

const RAW_DIR = path.join('production-test', 'raw');

type GumroadDetail = {
  id?: string;
  permalink?: string;
  name?: string;
  summary?: string | null;
  description_html?: string | null;
  long_url?: string;
  currency_code?: string;
  price_cents?: number | null;
  ratings?: { count?: number; average?: number };
  seller?: { id?: string; name?: string; profile_url?: string };
};

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function bucketPriceUSD(p: number): string {
  // NOTE: This assumes the value is in major units of the product's currency.
  // We do NOT FX-normalize; the bucket ranges are still useful per-currency.
  if (p === 0) return 'free';
  if (p <= 10) return '0-10';
  if (p <= 25) return '11-25';
  if (p <= 50) return '26-50';
  if (p <= 100) return '51-100';
  if (p <= 200) return '101-200';
  return '200+';
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'your',
  'you',
  'this',
  'that',
  'from',
  'into',
  'are',
  'was',
  'will',
  'a',
  'an',
  'to',
  'of',
  'in',
  'on',
  'by',
  'or',
  'as',
  'at',
  'it',
  'be',
  'is',
  'not',
  'no',
  'template',
  'templates',
  'notion',
  'ai',
  'prompt',
  'prompts',
  'pack',
  'bundle',
  'ultimate',
  'complete',
  'pro',
  'premium',
  'digital',
]);

async function listRunDirs(): Promise<string[]> {
  try {
    const ents = await fs.readdir(RAW_DIR, { withFileTypes: true });
    return ents
      .filter((e) => e.isDirectory() && /^\d{8}_\d{6}$/.test(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

async function findLatestMergedDir(): Promise<string | null> {
  const dirs = await listRunDirs();
  for (let i = dirs.length - 1; i >= 0; i--) {
    const merged = path.join(RAW_DIR, dirs[i], 'merged');
    try {
      const stat = await fs.stat(merged);
      if (stat.isDirectory()) return merged;
    } catch {
      // continue
    }
  }
  return null;
}

async function loadMergedDetail(category: TemplateCategory): Promise<GumroadDetail[] | null> {
  const mergedDir = await findLatestMergedDir();
  if (!mergedDir) return null;

  const filePath = path.join(mergedDir, `${category}.detail.json`);
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(txt) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as GumroadDetail[];
  } catch {
    return null;
  }
}

function buildResearchSnapshot(category: TemplateCategory, items: GumroadDetail[]): ResearchData {
  const competitorCount = items.length;

  const currencySet = new Set<string>();
  const pricesByCurrency = new Map<string, number[]>();
  const bandsByCurrency = new Map<string, Record<string, number>>();

  let ratingsCountTotal = 0;
  let ratingsWeightedSum = 0;

  const sellerCounts = new Map<string, { name: string; count: number; url?: string }>();
  const keywordCounts = new Map<string, number>();

  const competitorsPreview: Array<{
    name: string;
    url?: string;
    currency?: string;
    price?: number;
    ratingsCount?: number;
    ratingsAvg?: number;
    sellerName?: string;
  }> = [];

  for (const it of items) {
    const currency = (it.currency_code || 'unknown').toLowerCase();
    currencySet.add(currency);

    const price = typeof it.price_cents === 'number' ? it.price_cents / 100 : null;
    if (price !== null && Number.isFinite(price)) {
      const arr = pricesByCurrency.get(currency) || [];
      arr.push(price);
      pricesByCurrency.set(currency, arr);

      const band = bucketPriceUSD(price);
      const bands = bandsByCurrency.get(currency) || {};
      bands[band] = (bands[band] || 0) + 1;
      bandsByCurrency.set(currency, bands);
    }

    const rc = it.ratings?.count;
    const ra = it.ratings?.average;
    if (typeof rc === 'number' && typeof ra === 'number' && rc > 0) {
      ratingsCountTotal += rc;
      ratingsWeightedSum += rc * ra;
    }

    const sellerName = it.seller?.name || '';
    if (sellerName) {
      const key = `${it.seller?.id || sellerName}`;
      const prev = sellerCounts.get(key);
      sellerCounts.set(key, {
        name: sellerName,
        count: (prev?.count || 0) + 1,
        url: it.seller?.profile_url || prev?.url,
      });
    }

    const text = [it.name, it.summary, it.description_html].filter((x): x is string => typeof x === 'string' && x.trim().length > 0).join(' ');
    for (const tok of tokenize(text)) {
      if (tok.length < 3) continue;
      if (STOPWORDS.has(tok)) continue;
      keywordCounts.set(tok, (keywordCounts.get(tok) || 0) + 1);
    }

    if (competitorsPreview.length < 20) {
      competitorsPreview.push({
        name: it.name || '(untitled)',
        url: it.long_url,
        currency,
        price: price ?? undefined,
        ratingsCount: typeof rc === 'number' ? rc : undefined,
        ratingsAvg: typeof ra === 'number' ? ra : undefined,
        sellerName: it.seller?.name,
      });
    }
  }

  const currencies = Array.from(currencySet).sort();

  const priceStats: Record<string, { min: number | null; median: number | null; max: number | null; count: number }> = {};
  for (const c of currencies) {
    const prices = (pricesByCurrency.get(c) || []).filter((n) => Number.isFinite(n));
    if (!prices.length) {
      priceStats[c] = { min: null, median: null, max: null, count: 0 };
      continue;
    }
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    priceStats[c] = { min, median: median(prices), max, count: prices.length };
  }

  const priceBands: Record<string, Record<string, number>> = {};
  for (const c of currencies) priceBands[c] = bandsByCurrency.get(c) || {};

  const topKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([keyword, count]) => ({ keyword, count }));

  const topSellers = Array.from(sellerCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const ratingsAverageWeighted = ratingsCountTotal > 0 ? ratingsWeightedSum / ratingsCountTotal : null;

  return {
    category,
    generatedAt: new Date().toISOString(),
    source: 'production-test/merged-detail',
    competitors: {
      preview: competitorsPreview,
    },
    stats: {
      competitorCount,
      currencies,
      priceStats,
      priceBands,
      ratings: {
        totalCount: ratingsCountTotal,
        averageWeighted: ratingsAverageWeighted,
      },
      topKeywords,
      topSellers,
    },
    notes: [
      'Derived deterministically from the latest production-test/raw/<run>/merged/<CATEGORY>.detail.json.',
      'Prices are bucketed per currency without FX normalization.',
    ],
  };
}

export async function runResearch(args: {
  category: TemplateCategory;
  force?: boolean;
}): Promise<{ status: 'updated' | 'cached' | 'missing'; snapshotPath: string; snapshot: ResearchData | null }> {
  const { category, force } = args;

  const loaded = await loadSnapshot(category);
  if (loaded.snapshot && !force) {
    return { status: 'cached', snapshotPath: loaded.snapshotPath, snapshot: loaded.snapshot };
  }

  const merged = await loadMergedDetail(category);
  if (!merged) {
    // If we have *some* snapshot already, treat it as cached even if force was requested.
    if (loaded.snapshot) {
      return { status: 'cached', snapshotPath: loaded.snapshotPath, snapshot: loaded.snapshot };
    }
    return { status: 'missing', snapshotPath: loaded.snapshotPath, snapshot: null };
  }

  const snapshot = buildResearchSnapshot(category, merged);
  const p = await saveSnapshot(category, snapshot);
  return { status: 'updated', snapshotPath: p, snapshot };
}
