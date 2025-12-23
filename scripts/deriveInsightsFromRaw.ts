import './loadEnvLocal';
import fs from 'node:fs/promises';
import path from 'node:path';

type Category = 'AI_PROMPTS' | 'NOTION_TEMPLATES' | 'DIGITAL_PLANNERS' | 'DESIGN_TEMPLATES';
const CATEGORIES: Category[] = ['AI_PROMPTS', 'NOTION_TEMPLATES', 'DIGITAL_PLANNERS', 'DESIGN_TEMPLATES'];

function safeJson(v: string) {
  return JSON.parse(v);
}

async function readJsonIfExists(p: string) {
  try {
    return safeJson(await fs.readFile(p, 'utf8'));
  } catch {
    return null;
  }
}

function normalizePrice(v: any): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }
  return null;
}

function median(nums: number[]) {
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function topCounts(texts: { text: string; url?: string }[], rules: { label: string; re: RegExp }[]) {
  const out = rules.map((r) => {
    const matches = texts.filter((t) => r.re.test(t.text));
    return {
      label: r.label,
      count: matches.length,
      examples: matches.slice(0, 8).map((m) => ({ text: m.text.slice(0, 220), url: m.url })),
    };
  });
  return out.filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
}

export async function deriveInsights(rawStamp: string, outDir = 'production-test') {
  const rawDir = path.join(outDir, 'raw', rawStamp);

  const painRules = [
    { label: 'download/access issues', re: /download|unable to download|can\\s*'?t download|access|link broken|missing file/i },
    { label: 'setup confusion', re: /setup|onboarding|how to|steps|import guide|duplicate link/i },
    { label: 'licensing confusion', re: /license|commercial|usage rights|copyright/i },
    { label: 'compatibility issues', re: /goodnotes|notability|noteshelf|ipad|figma|canva|adobe/i },
    { label: 'expectation mismatch', re: /not what i expected|misleading|different than|doesn\\s*'?t work/i },
  ];

  const deliveryRules = [
    { label: 'ZIP / download all', re: /zip|download all/i },
    { label: 'Start Here / quickstart', re: /start here|quickstart|readme/i },
    { label: 'Notion duplicate link', re: /duplicate|notion link/i },
    { label: 'Import guide', re: /import guide|how to import/i },
    { label: 'License included', re: /license/i },
  ];

  const positioningRules = [
    { label: 'beginner-friendly', re: /beginner|no experience|step-by-step/i },
    { label: 'time-to-value', re: /minutes|in \d+|quick setup|fast/i },
    { label: 'done-for-you', re: /done for you|ready to use|plug and play/i },
    { label: 'updates', re: /lifetime updates|updates included/i },
    { label: 'templates included', re: /templates?|bundle|pack/i },
  ];

  const out: any = { generatedAt: new Date().toISOString(), rawStamp, categories: {} as any };

  for (const c of CATEGORIES) {
    const detailPath = path.join(rawDir, 'detail', `${c}.json`);
    const reviewsPath = path.join(rawDir, 'reviews', `${c}.json`);

    const details = (await readJsonIfExists(detailPath)) || [];
    const reviews = (await readJsonIfExists(reviewsPath)) || [];

    const texts: { text: string; url?: string }[] = [];

    for (const d of details) {
      const t = `${d.title || d.name || ''} ${d.description || d.summary || ''}`.trim();
      if (t) texts.push({ text: t, url: d.url || d.productUrl });
    }
    for (const r of reviews) {
      const t = `${r.title || ''} ${r.text || r.review || ''}`.trim();
      if (t) texts.push({ text: t, url: r.url || r.productUrl });
    }

    const prices = details.map((d: any) => normalizePrice(d.price)).filter((x: any) => typeof x === 'number') as number[];

    out.categories[c] = {
      competitorCount: details.length,
      reviewCount: reviews.length,
      pricing: {
        sampleSize: prices.length,
        min: prices.length ? Math.min(...prices) : undefined,
        median: prices.length ? median(prices) : undefined,
        max: prices.length ? Math.max(...prices) : undefined,
      },
      painPoints: topCounts(texts, painRules),
      deliveryExpectations: topCounts(texts, deliveryRules),
      positioningPatterns: topCounts(texts, positioningRules),
    };
  }

  await fs.writeFile(path.join(outDir, 'pain-points.json'), JSON.stringify(out, null, 2));
  await fs.writeFile(path.join(outDir, 'delivery-expectations.json'), JSON.stringify({ generatedAt: out.generatedAt, rawStamp, categories: Object.fromEntries(CATEGORIES.map((c) => [c, out.categories[c].deliveryExpectations])) }, null, 2));
  await fs.writeFile(path.join(outDir, 'pricing-bands.json'), JSON.stringify({ generatedAt: out.generatedAt, rawStamp, categories: Object.fromEntries(CATEGORIES.map((c) => [c, out.categories[c].pricing])) }, null, 2));
  await fs.writeFile(path.join(outDir, 'positioning-patterns.json'), JSON.stringify({ generatedAt: out.generatedAt, rawStamp, categories: Object.fromEntries(CATEGORIES.map((c) => [c, out.categories[c].positioningPatterns])) }, null, 2));

  return out;
}

if (process.argv[2]) {
  deriveInsights(process.argv[2]).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  console.error('Usage: tsx scripts/deriveInsightsFromRaw.ts <rawStamp>');
  process.exit(2);
}
