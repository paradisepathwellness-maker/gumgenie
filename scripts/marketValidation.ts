import './loadEnvLocal';
import fs from 'node:fs/promises';
import { generateMarketSnapshot, type MarketSnapshotCategory } from './apifyMarketSnapshot';
import { apifyFetchDataset, apifyRunActor, gumroadActors } from './gumroadActors';

type ValidationCategory = MarketSnapshotCategory;

type ValidationItem = {
  source: 'gumroad-search' | 'gumroad-detail' | 'gumroad-reviews' | 'serpapi';
  category: ValidationCategory;
  query: string;
  title?: string;
  url?: string;
  snippet?: string;
  rank?: number;
  price?: string | number;
  rating?: number;
};

type MarketValidation = {
  generatedAt: string;
  categories: Record<ValidationCategory, {
    query: string;
    competitorUrls: string[];
    items: ValidationItem[];
    priceBand: { min?: number; median?: number; max?: number; sampleSize: number };
    painPoints: { label: string; count: number; examples: string[] }[];
    deliveryExpectations: { label: string; count: number; examples: string[] }[];
    notes?: string;
  }>;
};

function requireEnv(name: string, fallbacks: string[] = []) {
  const candidates = [name, ...fallbacks];
  for (const k of candidates) {
    const v = process.env[k];
    if (v) return v;
  }
  throw new Error(`Missing required env var: ${name}`);
}

function toNumberPrice(v: any): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    return Number(m[1]);
  }
  return null;
}

function median(nums: number[]) {
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

async function serpApiQuery(q: string) {
  const key = requireEnv('SERPAPI_KEY', ['SERP_API_KEY', 'SERPAPI', 'SERPAPI_TOKEN']);
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', q);
  url.searchParams.set('api_key', key);
  url.searchParams.set('num', '10');
  const res = await fetch(url.toString());
  const txt = await res.text();
  if (!res.ok) throw new Error(`SerpAPI error (${res.status}): ${txt}`);
  return JSON.parse(txt) as any;
}

function extractSignals(texts: string[]) {
  const pain = [
    { label: 'download issues', re: /unable to download|can\\s*'?t download|download(ing)? issues|download failed/i },
    { label: 'setup confusion', re: /setup|onboarding|import guide|duplicate link|how to use/i },
    { label: 'unclear/too complex', re: /confus|hard to use|overwhelm|too complex|unclear/i },
    { label: 'licensing concerns', re: /license|commercial license|usage rights/i },
  ];

  const delivery = [
    { label: 'zip / download all', re: /zip|download all/i },
    { label: 'start here / quickstart', re: /start here|quickstart|readme/i },
    { label: 'notion duplicate link', re: /duplicate|notion link/i },
    { label: 'planner app compatibility', re: /goodnotes|notability|noteshelf|ipad/i },
    { label: 'design tool compatibility', re: /figma|canva|adobe/i },
  ];

  const make = (defs: { label: string; re: RegExp }[]) =>
    defs
      .map((d) => {
        const examples = texts.filter((t) => d.re.test(t)).slice(0, 5);
        return { label: d.label, count: examples.length, examples };
      })
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);

  return { painPoints: make(pain), deliveryExpectations: make(delivery) };
}

export async function runMarketValidation(outDir = 'production-test', opts?: { maxCompetitors?: number }) {
  await fs.mkdir(outDir, { recursive: true });

  const maxCompetitors = opts?.maxCompetitors ?? 20;

  // 1) Gumroad search snapshot
  const snapshot = await generateMarketSnapshot({ outDir, maxResultsPerCategory: maxCompetitors });

  const validation: MarketValidation = {
    generatedAt: new Date().toISOString(),
    categories: {} as any,
  };

  for (const c of Object.keys(snapshot.categories) as ValidationCategory[]) {
    const query = snapshot.categories[c].query;
    const competitorUrls = (snapshot.categories[c].sources || []).map((s) => s.url).filter(Boolean) as string[];

    const items: ValidationItem[] = [];

    snapshot.categories[c].sources.forEach((s) => {
      items.push({
        source: 'gumroad-search',
        category: c,
        query,
        title: s.title,
        url: s.url,
        snippet: s.description,
        rank: s.rank,
        price: s.price,
      });
    });

    // 2) Detail scrape
    let detailTexts: string[] = [];
    try {
      const run = await apifyRunActor(gumroadActors.detail, { urls: competitorUrls.slice(0, maxCompetitors) });
      const detailItems = await apifyFetchDataset(run.defaultDatasetId);
      detailItems.forEach((d: any) => {
        items.push({
          source: 'gumroad-detail',
          category: c,
          query,
          title: d.title || d.name,
          url: d.url || d.productUrl,
          snippet: d.description || d.summary,
          price: d.price,
          rating: d.rating,
        });
        detailTexts.push(`${d.title || ''} ${d.description || ''}`.trim());
      });
    } catch (e) {
      // ignore detail failure
    }

    // 3) Reviews scrape
    let reviewTexts: string[] = [];
    try {
      const run = await apifyRunActor(gumroadActors.reviews, { urls: competitorUrls.slice(0, Math.min(10, maxCompetitors)) });
      const reviewItems = await apifyFetchDataset(run.defaultDatasetId);
      reviewItems.forEach((r: any) => {
        const txt = `${r.title || ''} ${r.text || r.review || ''}`.trim();
        items.push({
          source: 'gumroad-reviews',
          category: c,
          query,
          title: r.title,
          url: r.url || r.productUrl,
          snippet: txt,
          rank: r.rating,
        });
        if (txt) reviewTexts.push(txt);
      });
    } catch (e) {
      // ignore
    }

    // 4) Optional SerpAPI enrichment
    try {
      const serp = await serpApiQuery(`site:gumroad.com ${query}`);
      (serp.organic_results || []).slice(0, 10).forEach((r: any) => {
        items.push({
          source: 'serpapi',
          category: c,
          query,
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          rank: r.position,
        });
      });
      (serp.people_also_ask || []).slice(0, 10).forEach((qaa: any) => {
        items.push({
          source: 'serpapi',
          category: c,
          query,
          title: qaa.question,
          url: qaa.link,
          snippet: qaa.snippet,
        });
      });
    } catch (e) {
      // ignore
    }

    const allTexts = [...items.map((i) => `${i.title || ''} ${i.snippet || ''}`.trim()), ...detailTexts, ...reviewTexts].filter(Boolean);
    const { painPoints, deliveryExpectations } = extractSignals(allTexts);

    const prices = items.map((i) => toNumberPrice(i.price)).filter((x): x is number => typeof x === 'number');
    const band = {
      sampleSize: prices.length,
      min: prices.length ? Math.min(...prices) : undefined,
      median: prices.length ? median(prices) : undefined,
      max: prices.length ? Math.max(...prices) : undefined,
    };

    validation.categories[c] = {
      query,
      competitorUrls,
      items,
      priceBand: band,
      painPoints,
      deliveryExpectations,
      notes: snapshot.categories[c].notes,
    };
  }

  await fs.writeFile(`${outDir}/market-validation.json`, JSON.stringify(validation, null, 2));

  const summary = {
    generatedAt: validation.generatedAt,
    categories: Object.fromEntries(
      (Object.keys(validation.categories) as ValidationCategory[]).map((c) => [
        c,
        {
          query: validation.categories[c].query,
          priceBand: validation.categories[c].priceBand,
          topPainPoints: validation.categories[c].painPoints.slice(0, 5),
          topDelivery: validation.categories[c].deliveryExpectations.slice(0, 5),
          exampleCompetitors: validation.categories[c].competitorUrls.slice(0, 5),
          notes: validation.categories[c].notes,
        },
      ])
    ),
  };

  await fs.writeFile(`${outDir}/market-validation.summary.json`, JSON.stringify(summary, null, 2));
  return validation;
}

// Run when invoked directly via tsx/node
if (process.argv[1] && process.argv[1].includes('marketValidation')) {
  runMarketValidation().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
