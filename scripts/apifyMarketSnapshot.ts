import './loadEnvLocal';
import fs from 'node:fs/promises';
import { apifyFetchDataset, apifyRunActor, gumroadActors } from './gumroadActors';

export type MarketSnapshotCategory = 'AI_PROMPTS' | 'NOTION_TEMPLATES' | 'DIGITAL_PLANNERS' | 'DESIGN_TEMPLATES';

export type MarketSourceItem = {
  title?: string;
  url?: string;
  description?: string;
  price?: string | number;
  sellerName?: string;
  rank?: number;
};

export type MarketSnapshot = {
  generatedAt: string;
  categories: Record<MarketSnapshotCategory, {
    query: string;
    sources: MarketSourceItem[];
    notes?: string;
  }>;
};

function uniqBy<T>(arr: T[], key: (t: T) => string | undefined) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const a of arr) {
    const k = key(a);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

export async function generateMarketSnapshot(opts: { outDir: string; categories?: MarketSnapshotCategory[]; maxResultsPerCategory?: number }) {
  const outDir = opts.outDir;
  const categories = opts.categories ?? ['AI_PROMPTS', 'NOTION_TEMPLATES', 'DIGITAL_PLANNERS', 'DESIGN_TEMPLATES'];
  const maxResults = opts.maxResultsPerCategory ?? 20;

  const queries: Record<MarketSnapshotCategory, string> = {
    AI_PROMPTS: 'ai prompts',
    NOTION_TEMPLATES: 'notion template',
    DIGITAL_PLANNERS: 'digital planner goodnotes',
    DESIGN_TEMPLATES: 'figma design templates commercial license',
  };

  const snapshot: MarketSnapshot = {
    generatedAt: new Date().toISOString(),
    categories: {} as any,
  };

  for (const c of categories) {
    const query = queries[c];
    try {
      // Search Gumroad directly
      // Gumroad search actors commonly expect `queries` as a string.
      const input = { keywords: String(query), queries: String(query), maxItems: maxResults };
      const run = await apifyRunActor(gumroadActors.search, input);

      const items = await apifyFetchDataset(run.defaultDatasetId);
      const mapped: MarketSourceItem[] = items.map((it: any, idx: number) => ({
        title: it.title || it.name,
        url: it.url || it.productUrl || it.link,
        description: it.description || it.snippet,
        price: it.price || it.priceValue || it.amount,
        sellerName: it.sellerName || it.creator || it.seller,
        rank: it.rank ?? idx + 1,
      }));

      snapshot.categories[c] = {
        query,
        sources: uniqBy(mapped, (x) => x.url).slice(0, maxResults),
      };
    } catch (e) {
      snapshot.categories[c] = {
        query,
        sources: [],
        notes: `${e instanceof Error ? e.message : String(e)} | input=${JSON.stringify({ queries: String(query), maxItems: maxResults })}`,
      };
    }
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(`${outDir}/market-data.json`, JSON.stringify(snapshot, null, 2));
  return snapshot;
}
