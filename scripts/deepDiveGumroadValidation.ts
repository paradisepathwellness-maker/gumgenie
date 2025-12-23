import './loadEnvLocal';
import fs from 'node:fs/promises';
import path from 'node:path';
import { apifyFetchDataset, apifyRunActor, gumroadActors } from './gumroadActors';

type Category = 'AI_PROMPTS' | 'NOTION_TEMPLATES' | 'DIGITAL_PLANNERS' | 'DESIGN_TEMPLATES';
const CATEGORIES: Category[] = ['AI_PROMPTS', 'NOTION_TEMPLATES', 'DIGITAL_PLANNERS', 'DESIGN_TEMPLATES'];

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function withConcurrency<T>(items: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const my = idx++;
      // eslint-disable-next-line no-await-in-loop
      const r = await items[my]();
      results[my] = r;
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function runDeepDive(opts?: { maxCompetitors?: number; concurrency?: number }) {
  const maxCompetitors = opts?.maxCompetitors ?? 30;
  const concurrency = opts?.concurrency ?? 10;

  const outDir = 'production-test';
  const stamp = nowStamp();
  const rawDir = path.join(outDir, 'raw', stamp);

  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(path.join(rawDir, 'detail'), { recursive: true });
  await fs.mkdir(path.join(rawDir, 'reviews'), { recursive: true });
  await fs.mkdir(path.join(rawDir, 'merged'), { recursive: true });

  // 1) Discovery stage (competitors)
  // The Gumroad search actor can be brittle. For deep dives, we use SerpAPI to reliably discover Gumroad listing URLs,
  // then pass those URLs into detail+reviews actors.
  // 1) Discovery stage (competitors)
  // Deep-dive uses SerpAPI for URL discovery (best-effort) and then scrapes those product URLs with Apify.
  // This keeps the EasyApi multi-actor combo reserved for Turbo mode.
  const marketData: any = { source: 'serpapi', generatedAt: new Date().toISOString(), maxCompetitors, categories: {} as Record<string, any> };

  async function serpDiscover(q: string): Promise<string[]> {
    const key = process.env.SERPAPI_KEY || process.env.SERP_API_KEY || process.env.SERPAPI_TOKEN;
    if (!key) throw new Error('Missing SERPAPI_KEY');

    const collected: string[] = [];
    const seen = new Set<string>();

    // Google SERP typically returns ~10 organic results per page; pagination is required to reach up to 30.
    const perPage = 10;
    const maxPages = 5; // conservative cap to avoid runaway usage

    for (let page = 0; page < maxPages && collected.length < maxCompetitors; page++) {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google');
      url.searchParams.set('q', q);
      url.searchParams.set('api_key', key);
      url.searchParams.set('num', String(perPage));
      url.searchParams.set('start', String(page * perPage));

      const res = await fetch(url.toString());
      const txt = await res.text();
      if (!res.ok) throw new Error(`SerpAPI error (${res.status}): ${txt}`);
      const json = JSON.parse(txt);

      const links = (json.organic_results || []).map((r: any) => r.link).filter(Boolean) as string[];
      const gumroadLinks = links.filter((l) => l.includes('gumroad.com'));

      for (const l of gumroadLinks) {
        if (seen.has(l)) continue;
        seen.add(l);
        collected.push(l);
        if (collected.length >= maxCompetitors) break;
      }
    }

    return collected;
  }

  const discoveryQueries: Record<Category, string> = {
    AI_PROMPTS: 'site:gumroad.com (prompt pack OR prompts bundle OR ai prompts) gumroad',
    NOTION_TEMPLATES: 'site:gumroad.com (notion template OR notion system) gumroad',
    DIGITAL_PLANNERS: 'site:gumroad.com (digital planner OR goodnotes planner OR ipad planner) gumroad',
    DESIGN_TEMPLATES: 'site:gumroad.com (figma template OR design template OR UI kit) gumroad',
  };

  const competitorUrlsByCategory: Record<Category, string[]> = {} as any;
  for (const c of CATEGORIES) {
    const urls = await serpDiscover(discoveryQueries[c]);
    competitorUrlsByCategory[c] = urls.slice(0, maxCompetitors);

    marketData.categories[c] = {
      query: discoveryQueries[c],
      competitorCount: competitorUrlsByCategory[c].length,
    };

    await fs.writeFile(path.join(rawDir, `competitors_${c}.json`), JSON.stringify(competitorUrlsByCategory[c], null, 2));
  }

  await fs.writeFile(path.join(rawDir, 'market-data.json'), JSON.stringify(marketData, null, 2));

  // Reviews actor may require a paid rental. Preflight once to avoid spamming failing runs.
  let reviewsEnabled = true;
  let reviewsDisabledReason: string | undefined;
  const sampleUrl = CATEGORIES.map((c) => competitorUrlsByCategory[c]?.[0]).find(Boolean);
  if (sampleUrl) {
    try {
      await apifyRunActor(gumroadActors.reviews, { productUrls: [sampleUrl], urls: [sampleUrl], maxItems: 1 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('actor-is-not-rented') || msg.includes('Apify run failed (403)')) {
        reviewsEnabled = false;
        reviewsDisabledReason = msg;
      }
    }
  }

  const chunkSize = 10;
  const chunk = <T,>(arr: T[], size: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  // 2) Detail runs (batched: 3 batches/category for 30 URLs)
  const detailRuns: Array<() => Promise<{ category: Category; batch: number; count: number; datasetId: string }>> = [];
  for (const c of CATEGORIES) {
    const urls = competitorUrlsByCategory[c].slice(0, maxCompetitors);
    const batches = chunk(urls, chunkSize);
    batches.forEach((batchUrls, batchIdx) => {
      detailRuns.push(async () => {
        try {
          const run = await apifyRunActor(gumroadActors.detail, {
            category: 'all_products',
            fileType: [],
            sort: 'trending',
            maxProducts: batchUrls.length,
            minPrice: 0,
            maxPrice: 0,
            minRating: 0,
            productUrls: batchUrls,
            proxyConfiguration: {
              useApifyProxy: true,
              apifyProxyGroups: [],
            },
          });
          const items = await apifyFetchDataset(run.defaultDatasetId);
          await fs.writeFile(path.join(rawDir, 'detail', `${c}.batch${batchIdx + 1}.json`), JSON.stringify(items, null, 2));
          return { category: c, batch: batchIdx + 1, count: items.length, datasetId: run.defaultDatasetId };
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          await fs.writeFile(path.join(rawDir, 'detail', `${c}.batch${batchIdx + 1}.error.txt`), err);
          return { category: c, batch: batchIdx + 1, count: 0, datasetId: 'error' };
        }
      });
    });
  }

  // 3) Review runs (batched: 3 batches/category for 30 URLs)
  const reviewRuns: Array<() => Promise<{ category: Category; batch: number; count: number; datasetId: string }>> = [];
  if (!reviewsEnabled) {
    // Keep the pipeline best-effort: detail still runs; reviews are simply skipped.
    // Merged review outputs will be empty arrays.
    // eslint-disable-next-line no-console
    const hint = 'To enable reviews, set APIFY_GUMROAD_REVIEWS_ACTOR_ID to a rented reviews actor (e.g. muhammetakkurtt/gumroad-review-scraper).';
    console.warn(`Reviews stage skipped: ${reviewsDisabledReason ?? 'disabled'}. ${hint}`);
  }
  if (reviewsEnabled) {
    for (const c of CATEGORIES) {
      const urls = competitorUrlsByCategory[c].slice(0, maxCompetitors);
      const batches = chunk(urls, chunkSize);
      batches.forEach((batchUrls, batchIdx) => {
        reviewRuns.push(async () => {
          try {
            const run = await apifyRunActor(gumroadActors.reviews, { productUrls: batchUrls, urls: batchUrls });
            const items = await apifyFetchDataset(run.defaultDatasetId);
            await fs.writeFile(path.join(rawDir, 'reviews', `${c}.batch${batchIdx + 1}.json`), JSON.stringify(items, null, 2));
            return { category: c, batch: batchIdx + 1, count: items.length, datasetId: run.defaultDatasetId };
          } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            await fs.writeFile(path.join(rawDir, 'reviews', `${c}.batch${batchIdx + 1}.error.txt`), err);
            return { category: c, batch: batchIdx + 1, count: 0, datasetId: 'error' };
          }
        });
      });
    }
  }

  // Execute batched detail+reviews with concurrency cap (true 10-concurrent)
  const detailResults = await withConcurrency(detailRuns, concurrency);
  const reviewResults = reviewsEnabled ? await withConcurrency(reviewRuns, concurrency) : [];

  // Merge batch files into single per-category files for downstream analysis
  for (const c of CATEGORIES) {
    const detailMerged: any[] = [];
    const reviewMerged: any[] = [];

    const detailFiles = (await fs.readdir(path.join(rawDir, 'detail'))).filter((f) => f.startsWith(c) && f.endsWith('.json'));
    for (const f of detailFiles) {
      const j = JSON.parse(await fs.readFile(path.join(rawDir, 'detail', f), 'utf8'));
      if (Array.isArray(j)) detailMerged.push(...j);
    }

    const reviewFiles = (await fs.readdir(path.join(rawDir, 'reviews'))).filter((f) => f.startsWith(c) && f.endsWith('.json'));
    for (const f of reviewFiles) {
      const j = JSON.parse(await fs.readFile(path.join(rawDir, 'reviews', f), 'utf8'));
      if (Array.isArray(j)) reviewMerged.push(...j);
    }

    await fs.writeFile(path.join(rawDir, 'merged', `${c}.detail.json`), JSON.stringify(detailMerged, null, 2));
    await fs.writeFile(path.join(rawDir, 'merged', `${c}.reviews.json`), JSON.stringify(reviewMerged, null, 2));
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    maxCompetitors,
    concurrency,
    chunkSize,
    actors: gumroadActors,
    detailResults,
    reviewResults,
    reviewsEnabled,
    reviewsDisabledReason,
  };
  await fs.writeFile(path.join(rawDir, 'run-summary.json'), JSON.stringify(summary, null, 2));

  return { stamp, rawDir, summary };
}

if (process.argv[1] && process.argv[1].includes('deepDiveGumroadValidation')) {
  runDeepDive().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
