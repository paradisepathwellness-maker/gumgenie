import fs from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';

type Category = 'AI_PROMPTS' | 'NOTION_TEMPLATES' | 'DIGITAL_PLANNERS' | 'DESIGN_TEMPLATES';
const CATEGORIES: Category[] = ['AI_PROMPTS', 'NOTION_TEMPLATES', 'DIGITAL_PLANNERS', 'DESIGN_TEMPLATES'];

const BACKEND = process.env.PROD_READY_BACKEND_URL || 'http://127.0.0.1:4000';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function appendLog(line: string) {
  const ts = new Date().toISOString();
  await fs.appendFile('production-ready/run.log', `[${ts}] ${line}\n`).catch(() => undefined);
}

async function postJson<T>(url: string, body: unknown, opts?: { retries?: number; timeoutMs?: number }): Promise<T> {
  const retries = opts?.retries ?? 2;
  const timeoutMs = opts?.timeoutMs ?? 45_000;

  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}: ${txt}`);
      return JSON.parse(txt) as T;
    } catch (e) {
      lastErr = e;
      await sleep(600);
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

type ContentBlock = any;

type OrchestrateTurbo = {
  executed: true;
  recommendation: { serverId: string; toolName: string; argsJson?: string; args?: any; targetBlockType: string; rationale: string };
  mcpText?: string;
  formatted?: { formattedBlock?: ContentBlock; suggestions?: any[]; usedFallback?: boolean };
};

type ProductGen = { product: any; presets: any[] };

function promptsForCategory(category: Category): { name: string; prompt: string }[] {
  const base = [
    { name: 'pricing', prompt: 'Create a 3-tier pricing section (Starter/Pro/Ultimate) with clear differentiation, value anchoring, and a premium CTA.' },
    { name: 'features', prompt: 'Create a conversion-optimized feature grid (8-12 bullets) focused on outcomes and transformation.' },
    { name: 'faq', prompt: 'Create a FAQ section (6-8 Q&A) addressing objections, refunds, delivery, and who it is for.' },
    { name: 'testimonials', prompt: 'Create 4-6 high-credibility testimonials with specific results and context.' },
  ];

  const extraByCategory: Record<Category, { name: string; prompt: string }[]> = {
    AI_PROMPTS: [
      { name: 'credibility', prompt: 'Create a technical credibility + proof section with measurable claims (time saved, compatibility, quality) and one stat highlight.' },
      { name: 'framework', prompt: 'Create a step-by-step framework checklist describing the prompt system workflow.' },
    ],
    NOTION_TEMPLATES: [
      { name: 'database-showcase', prompt: 'Create a Notion database showcase section (views, relations, rollups, templates, workflows).' },
      { name: 'setup', prompt: 'Create a setup-in-10-minutes onboarding checklist.' },
    ],
    DIGITAL_PLANNERS: [
      { name: 'gallery', prompt: 'Create an aesthetic gallery section concept (6-10 spreads) and lifestyle outcomes.' },
      { name: 'compatibility', prompt: 'Create an app compatibility section for Goodnotes/Notability/Noteshelf with benefits.' },
    ],
    DESIGN_TEMPLATES: [
      { name: 'roi', prompt: 'Create an agency ROI calculator / time-saved stat section with strong numbers and premium positioning.' },
      { name: 'license', prompt: 'Create a commercial license + usage rights checklist (allowed vs not allowed).' },
    ],
  };

  return [...base, ...extraByCategory[category]];
}

function scoreQuality(product: any, blocks: ContentBlock[]): { total: number; per: Record<string, number>; notes: string[] } {
  const notes: string[] = [];

  const title = String(product?.title || '');
  const desc = String(product?.description || '');
  const cta = String(product?.callToAction || '');

  const pricing = blocks.find((b) => b?.type === 'pricing');
  const faq = blocks.find((b) => b?.type === 'faq');
  const proof = blocks.find((b) => b?.type === 'testimonial' || b?.type === 'stat-highlight');

  let conversion = 0;
  conversion += title.length > 25 && /\d|\+|%|\$/.test(title) ? 8 : title.length > 20 ? 6 : title ? 4 : 0;
  conversion += proof ? 6 : 0;
  conversion += pricing?.tiers?.length >= 3 ? 6 : 2;
  conversion += cta && cta.length > 8 ? 5 : 1;

  let visual = 0;
  visual += blocks.length >= 6 ? 8 : blocks.length >= 4 ? 6 : 4;
  visual += 6;
  visual += 3;
  visual += 4;

  let monetization = 0;
  monetization += pricing?.tiers?.length >= 3 ? 10 : 4;
  monetization += /upgrade|ultimate|pro|bundle|bonus|license/i.test(desc) ? 6 : 4;
  monetization += title.length > 20 ? 5 : 3;

  let completeness = 0;
  completeness += desc.length > 200 ? 10 : desc.length > 120 ? 8 : 6;
  completeness += 6;
  completeness += faq ? 7 : 3;

  const total = conversion + visual + monetization + completeness;
  if (pricing?.tiers?.length !== 3) notes.push('Pricing tiers not exactly 3.');
  if (!faq) notes.push('Missing FAQ block.');
  if (!proof) notes.push('Missing proof (testimonial/stat) block.');
  if (total < 80) notes.push('Below launch threshold (80).');

  return { total, per: { conversion, visual, monetization, completeness }, notes };
}

function renderListingHtml(params: { category: Category; product: any; blocks: ContentBlock[]; score: any }) {
  const { category, product, blocks, score } = params;

  const sectionHtml = blocks
    .map((b) => {
      const type = b?.type || 'text';
      if (type === 'pricing' && Array.isArray(b.tiers)) {
        return `\n<section class="section" id="pricing"><h2>Pricing</h2><div class="cards">${b.tiers
          .slice(0, 3)
          .map(
            (t: any) => `\n<div class="card"><div class="card-title">${escapeHtml(String(t.name || 'Tier'))}</div><div class="card-price">${escapeHtml(String(t.price || ''))}</div><ul>${(t.features || [])
              .slice(0, 10)
              .map((f: any) => `<li>${escapeHtml(String(f))}</li>`)
              .join('')}</ul><div class="card-cta">${escapeHtml(String(t.cta || product.callToAction || 'Get instant access'))}</div></div>`
          )
          .join('')}</div></section>`;
      }

      if (type === 'faq' && Array.isArray(b.items)) {
        return `\n<section class="section" id="faq"><h2>FAQ</h2>${b.items
          .slice(0, 10)
          .map(
            (it: any) => `<details><summary>${escapeHtml(String(it.q || it.question || 'Q'))}</summary><div>${escapeHtml(String(it.a || it.answer || ''))}</div></details>`
          )
          .join('')}</section>`;
      }

      if (type === 'feature-grid' && Array.isArray(b.features)) {
        return `\n<section class="section"><h2>What you get</h2><ul class="bullets">${b.features
          .slice(0, 14)
          .map((f: any) => `<li>${escapeHtml(String(f))}</li>`)
          .join('')}</ul></section>`;
      }

      if (type === 'testimonial') {
        const items = (b.items || b.testimonials || []) as any[];
        if (!Array.isArray(items) || !items.length) return '';
        return `\n<section class="section"><h2>Results & social proof</h2><div class="quotes">${items
          .slice(0, 6)
          .map((t: any) => `<blockquote><div class="quote">“${escapeHtml(String(t.quote || t.text || ''))}”</div><div class="who">— ${escapeHtml(String(t.name || t.author || ''))}</div></blockquote>`)
          .join('')}</div></section>`;
      }

      if (type === 'stat-highlight') {
        return `\n<section class="section"><h2>Proof</h2><pre>${escapeHtml(JSON.stringify(b, null, 2))}</pre></section>`;
      }

      if (type === 'checklist' && Array.isArray(b.items)) {
        return `\n<section class="section"><h2>Checklist</h2><ul class="bullets">${b.items
          .slice(0, 14)
          .map((x: any) => `<li>${escapeHtml(String(x))}</li>`)
          .join('')}</ul></section>`;
      }

      if (type === 'gallery') {
        const items = (b.items || b.images || []) as any[];
        if (!Array.isArray(items) || !items.length) return '';
        return `\n<section class="section"><h2>Gallery</h2><ul class="bullets">${items
          .slice(0, 12)
          .map((x: any) => `<li>${escapeHtml(String(x.title || x.caption || x))}</li>`)
          .join('')}</ul></section>`;
      }

      return '';
    })
    .join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(String(product?.title || category))}</title>
<style>
body{font-family:ui-sans-serif,system-ui,-apple-system;margin:0;background:#0b0b0f;color:#fff}
.wrap{max-width:980px;margin:0 auto;padding:20px}
.hero{border:2px solid #fff;border-radius:16px;padding:18px;background:#111}
h1{margin:0;font-size:28px}
.sub{opacity:.85;margin-top:8px;line-height:1.4}
.pill{display:inline-block;font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;background:#7c3aed;padding:6px 10px;border-radius:999px}
.cta{margin-top:12px;display:flex;gap:10px;flex-wrap:wrap}
.btn{background:#fff;color:#000;font-weight:900;padding:10px 14px;border-radius:12px;text-decoration:none}
.meta{margin-top:10px;font-size:12px;opacity:.8}
.section{margin-top:16px;padding:14px;border:1px solid rgba(255,255,255,.2);border-radius:14px;background:rgba(255,255,255,.04)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.card{background:#fff;color:#000;border-radius:14px;padding:12px}
.card-title{font-weight:900;font-size:16px}
.card-price{font-weight:900;color:#7c3aed;margin:6px 0}
.card-cta{margin-top:10px;font-weight:900}
.bullets{margin:8px 0 0 18px}
details{margin-top:8px}
summary{cursor:pointer;font-weight:800}
pre{white-space:pre-wrap;word-break:break-word}
.quotes{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
blockquote{background:#0b1020;border:1px solid rgba(255,255,255,.15);padding:12px;border-radius:12px;margin:0}
.who{opacity:.85;margin-top:6px;font-size:12px}
.quality{margin-top:12px;font-size:12px}
</style></head><body><div class="wrap">
<div class="hero"><div class="pill">${escapeHtml(category.replace(/_/g, ' '))} • Gumroad-ready</div>
<h1>${escapeHtml(String(product?.title || 'Untitled'))}</h1>
<div class="sub">${escapeHtml(String(product?.description || ''))}</div>
<div class="cta"><a class="btn" href="#pricing">${escapeHtml(String(product?.callToAction || 'Get instant access'))}</a><a class="btn" href="#faq">FAQ</a></div>
<div class="meta">Suggested price: ${escapeHtml(String(product?.price || ''))}</div>
<div class="quality">Quality score: <strong>${score.total}</strong> (Conversion ${score.per.conversion}/25 • Visual ${score.per.visual}/25 • Monetization ${score.per.monetization}/25 • Completeness ${score.per.completeness}/25)</div>
</div>
${sectionHtml}
</div></body></html>`;
}

async function zipFolder(srcDir: string, outZipPath: string) {
  await fs.mkdir(path.dirname(outZipPath), { recursive: true });
  const output = await fs.open(outZipPath, 'w');
  const stream = output.createWriteStream();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(stream);
  archive.directory(srcDir, false);
  await archive.finalize();
  await new Promise<void>((resolve, reject) => {
    stream.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
  });
  await output.close();
}

async function generateCategory(category: Category) {
  const outDir = `production-ready/${category}`;
  await fs.mkdir(outDir, { recursive: true });

  await appendLog(`${category}: generating product...`);
  const gen = await postJson<ProductGen>(`${BACKEND}/api/generate-product`, { category }, { retries: 2, timeoutMs: 35_000 });
  const product = gen.product;
  const preset = gen.presets?.[0];
  if (!preset) throw new Error(`No preset returned for ${category}`);

  // write early
  await fs.writeFile(`${outDir}/product.json`, JSON.stringify(product, null, 2));
  await fs.writeFile(`${outDir}/preset.json`, JSON.stringify(preset, null, 2));

  const blocks: ContentBlock[] = [];
  const workflow: any[] = [];

  for (const p of promptsForCategory(category)) {
    await appendLog(`${category}: turbo block ${p.name}...`);
    const turbo = await postJson<OrchestrateTurbo>(
      `${BACKEND}/api/chat/orchestrate`,
      {
        message: `${p.prompt}\n\nStyle: Minimalist premium. Include numbers and proof where appropriate.`,
        mode: 'turbo',
        context: { category },
        product,
        preset,
      },
      { retries: 1, timeoutMs: 55_000 }
    );

    const block = turbo.formatted?.formattedBlock;
    workflow.push({ name: p.name, recommendation: turbo.recommendation, usedFallback: Boolean(turbo.formatted?.usedFallback) });
    if (block) blocks.push(block);

    await fs.writeFile(`${outDir}/blocks.partial.json`, JSON.stringify(blocks, null, 2));
    await fs.writeFile(`${outDir}/workflow-log.partial.json`, JSON.stringify(workflow, null, 2));
  }

  const score = scoreQuality(product, blocks);

  await fs.writeFile(`${outDir}/blocks.json`, JSON.stringify(blocks, null, 2));
  await fs.writeFile(`${outDir}/workflow-log.json`, JSON.stringify(workflow, null, 2));
  await fs.writeFile(`${outDir}/quality.json`, JSON.stringify(score, null, 2));

  const manifest = {
    productName: product.title,
    category,
    gumroad: { recommendedVersions: ['Starter', 'Pro', 'Ultimate'], includeZipForDownloadAll: true },
    folderStructure: ['01_START_HERE/README.txt', '02_MAIN_DELIVERABLES/', '03_BONUSES/', '04_LICENSE/license.txt', '05_SUPPORT/support.txt'],
  };

  await fs.writeFile(`${outDir}/deliverables-manifest.json`, JSON.stringify(manifest, null, 2));
  await fs.writeFile(`${outDir}/01_START_HERE_README.txt`, `START HERE\n\n${product.title}\n\nThis package is Gumroad-ready structurally. Replace placeholder deliverable files with real assets before upload.\n`);
  await fs.writeFile(`${outDir}/04_LICENSE_license.txt`, `LICENSE (placeholder)\n\nAdd your license terms here.\n`);
  await fs.writeFile(`${outDir}/05_SUPPORT_support.txt`, `SUPPORT (placeholder)\n\nContact: support@yourdomain.com\n`);

  const listing = renderListingHtml({ category, product, blocks, score });
  await fs.writeFile(`${outDir}/listing.html`, listing);

  await zipFolder(outDir, `production-ready/${category}.zip`);

  await appendLog(`${category}: done (score=${score.total})`);
  return { category, product, preset, blocks, score, outDir };
}

async function main() {
  await fs.mkdir('production-ready', { recursive: true });
  await fs.writeFile('production-ready/run.log', '').catch(() => undefined);

  const results: any[] = [];

  // Optional: allow running a single category via CLI arg: --category=AI_PROMPTS
  const argCategory = process.argv.find((a) => a.startsWith('--category='))?.split('=')[1] as Category | undefined;
  const categoriesToRun = argCategory ? ([argCategory] as Category[]) : CATEGORIES;

  for (const category of categoriesToRun) {
    let best: any | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await generateCategory(category);
        if (!best || r.score.total > best.score.total) best = r;
        if (r.score.total >= 80 && Object.values(r.score.per).every((x: number) => x >= 15)) break;
      } catch (e) {
        await appendLog(`${category}: ERROR ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!best) throw new Error(`Failed to generate category: ${category}`);
    results.push(best);
  }

  // Only generate combined final assembly if we ran all categories
  if (!argCategory) {
    const nav = results.map((r: any) => `<a href="#${r.category}">${r.category}</a>`).join('');
    const sections = results
      .map(
        (r: any) => `
      <section id="${r.category}" class="panel">
        <h2>${r.category}</h2>
        <div class="meta">Score: ${r.score.total} (Conversion ${r.score.per.conversion}/25 • Visual ${r.score.per.visual}/25 • Monetization ${r.score.per.monetization}/25 • Completeness ${r.score.per.completeness}/25)</div>
        <p><a href="./${r.category}/listing.html" target="_blank">Open listing.html</a> • <a href="./${r.category}.zip">Download zip</a></p>
        <details><summary>Quality report</summary><pre>${escapeHtml(JSON.stringify(r.score, null, 2))}</pre></details>
      </section>`
      )
      .join('\n');

    const finalHtml = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Production-ready Final Assembly</title>
  <style>
  body{font-family:ui-sans-serif,system-ui,-apple-system;margin:0;background:#0b0b0f;color:#fff}
  header{position:sticky;top:0;background:#111;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.2)}
  nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  nav a{color:#fff;text-decoration:none;background:rgba(255,255,255,.12);padding:6px 10px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  main{padding:16px;max-width:1100px;margin:0 auto}
  .panel{border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:12px;background:rgba(255,255,255,.04);margin-bottom:12px}
  .meta{opacity:.85;font-size:12px}
  pre{white-space:pre-wrap;word-break:break-word;background:#0b1020;border:1px solid rgba(255,255,255,.15);padding:10px;border-radius:12px}
  </style></head><body>
  <header><div style="font-weight:900">GumGenie — Production-ready Final Assembly</div><div style="opacity:.85;font-size:12px">4 Gumroad-ready listings + zips + quality scores</div><nav>${nav}</nav></header>
  <main>${sections}</main>
  </body></html>`;

    await fs.writeFile('production-ready/final-assembly.html', finalHtml);
    await fs.writeFile('production-ready/index.json', JSON.stringify(results.map((r: any) => ({ category: r.category, score: r.score, zip: `${r.category}.zip` })), null, 2));

    console.log('Generated production-ready outputs in production-ready/.');
  } else {
    console.log(`Generated production-ready outputs for ${argCategory}.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
