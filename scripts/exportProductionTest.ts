import './loadEnvLocal';
import fs from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';
import { generateMarketSnapshot } from './apifyMarketSnapshot';

const OUT_DIR = 'production-test';

type Category = 'AI_PROMPTS' | 'NOTION_TEMPLATES' | 'DIGITAL_PLANNERS' | 'DESIGN_TEMPLATES';
const CATEGORIES: Category[] = ['AI_PROMPTS', 'NOTION_TEMPLATES', 'DIGITAL_PLANNERS', 'DESIGN_TEMPLATES'];

type ArtifactSet = {
  product?: any;
  preset?: any;
  ask?: any;
  turbo?: any;
  errors: string[];
};

function safeReadJson(filePath: string): Promise<any | null> {
  return fs.readFile(filePath, 'utf8').then((t) => JSON.parse(t)).catch(() => null);
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderBlockPreview(block: any): string {
  if (!block || typeof block !== 'object') return '<em>No formatted block</em>';
  const type = block.type || 'unknown';

  if (type === 'pricing' && Array.isArray(block.tiers)) {
    return `
      <div class="cards">
        ${block.tiers
          .slice(0, 4)
          .map(
            (t: any) => `
            <div class="card">
              <div class="card-title">${escapeHtml(String(t.name || 'Tier'))}</div>
              <div class="card-price">${escapeHtml(String(t.price || ''))}</div>
              <ul>${(t.features || []).slice(0, 8).map((f: any) => `<li>${escapeHtml(String(f))}</li>`).join('')}</ul>
            </div>`
          )
          .join('')}
      </div>`;
  }

  if (type === 'feature-grid' && Array.isArray(block.features)) {
    return `<ul>${block.features.slice(0, 12).map((f: any) => `<li>${escapeHtml(String(f))}</li>`).join('')}</ul>`;
  }

  if (type === 'faq' && Array.isArray(block.items)) {
    return `<div>${block.items
      .slice(0, 8)
      .map((it: any) => `<details><summary>${escapeHtml(String(it.q || it.question || 'Q'))}</summary><div>${escapeHtml(String(it.a || it.answer || ''))}</div></details>`)
      .join('')}</div>`;
  }

  return `<pre>${escapeHtml(JSON.stringify(block, null, 2))}</pre>`;
}

async function zipDirectory(sourceDir: string, outPath: string) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const outputStream = (await fs.open(outPath, 'w')).createWriteStream();
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(outputStream);
  archive.directory(sourceDir, false);

  await archive.finalize();

  await new Promise<void>((resolve, reject) => {
    outputStream.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
  });
}

function mdLine(s = '') {
  return s;
}

function buildMarkdownReport(params: {
  generatedAt: string;
  artifacts: Record<Category, ArtifactSet>;
  market: any;
}) {
  const { generatedAt, artifacts, market } = params;
  const md: string[] = [];

  md.push('# GumGenie Production Test Report');
  md.push(mdLine());
  md.push(`Generated at: ${generatedAt}`);
  md.push(mdLine());

  md.push('## Comprehensive Overview');
  md.push('- This report captures Ask → Turbo orchestration outputs for all 4 template categories.');
  md.push('- Includes Apify-based market snapshot signals and a preview of formatted Canvas blocks.');
  md.push(mdLine());

  md.push('## Strategic Analysis (cross-category)');
  md.push('- Pricing: Use 3-tier pricing with clear upgrade paths + value anchoring.');
  md.push('- Proof strategy by category:');
  md.push('  - AI Prompts: frameworks, benchmarks, multi-model compatibility');
  md.push('  - Notion Templates: setup simplicity, workflow clarity, database sophistication');
  md.push('  - Digital Planners: lifestyle outcomes, aesthetics, app compatibility');
  md.push('  - Design Templates: ROI, time-saved, commercial licensing');
  md.push('- Packaging: include a ZIP if payload > 500MB to ensure reliable “Download all” behavior (per Gumroad guidance).');
  md.push(mdLine());

  md.push('## Key Insights');
  md.push('1. Use a single, consistent block type per intent (pricing → pricing block; FAQ → FAQ block).');
  md.push('2. Always collect a style preference before final component generation to avoid mismatched visuals.');
  md.push('3. Treat versions/tier delivery as a product architecture, not just pricing.');
  md.push(mdLine());

  md.push('## Key Actionable Steps');
  md.push('1. Run Turbo for each category with style follow-up: Glassmorphic / Minimalist / 3D.');
  md.push('2. Verify formatted blocks render correctly in the Canvas preview and insert cleanly.');
  md.push('3. Map deliverables into Gumroad Versions: Starter / Pro / Ultimate.');
  md.push('4. Build a full-assembly ZIP with Start Here + License + Support.');
  md.push(mdLine());

  md.push('## Workflow Execution Log');
  md.push('- This export captures artifacts from the latest local runs (Ask/Turbo JSON + formatted block + market snapshot).');
  md.push('- For per-request timing logs, run the frontend with `?debugChat` and re-export.');
  md.push(mdLine());

  md.push('## Per-template Results');
  md.push(mdLine());

  for (const c of CATEGORIES) {
    const rec = artifacts[c].ask?.recommendation || artifacts[c].turbo?.recommendation || null;
    const blockType = artifacts[c].turbo?.recommendation?.targetBlockType || null;
    const sources = market?.categories?.[c]?.sources || [];

    md.push(`### ${c}`);
    md.push(`- Recommendation: ${rec ? `${rec.serverId}:${rec.toolName}` : 'N/A'}`);
    md.push(`- Target block type: ${blockType || 'N/A'}`);
    md.push(`- Errors: ${artifacts[c].errors.length ? artifacts[c].errors.join(', ') : 'None'}`);
    md.push(mdLine());

    md.push('**Market data (top sources)**');
    for (const s of sources.slice(0, 8)) {
      md.push(`- ${s.title || s.url} (${s.url})`);
    }
    md.push(mdLine());
  }

  md.push('## Structured Market Data Appendix');
  md.push('See: `market-data.json`');
  md.push(mdLine());

  return md.join('\n');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Copy latest tmp-workflows artifacts into production-test (source of truth for this export run)
  const srcDir = 'tmp-workflows';
  try {
    const files = await fs.readdir(srcDir);
    for (const f of files) {
      if (!f.endsWith('.json') && !f.endsWith('.txt')) continue;
      await fs.copyFile(path.join(srcDir, f), path.join(OUT_DIR, f));
    }
  } catch {
    // ignore
  }

  // Load artifacts
  const artifacts: Record<Category, ArtifactSet> = {
    AI_PROMPTS: { errors: [] },
    NOTION_TEMPLATES: { errors: [] },
    DIGITAL_PLANNERS: { errors: [] },
    DESIGN_TEMPLATES: { errors: [] },
  };

  for (const c of CATEGORIES) {
    artifacts[c].product = (await safeReadJson(`${OUT_DIR}/${c}_product.json`)) ?? undefined;
    artifacts[c].preset = (await safeReadJson(`${OUT_DIR}/${c}_preset.json`)) ?? undefined;
    artifacts[c].ask = (await safeReadJson(`${OUT_DIR}/${c}_ask.json`)) ?? undefined;
    artifacts[c].turbo = (await safeReadJson(`${OUT_DIR}/${c}_turbo.json`)) ?? undefined;

    if (!artifacts[c].product) artifacts[c].errors.push('Missing product.json');
    if (!artifacts[c].preset) artifacts[c].errors.push('Missing preset.json');
    if (!artifacts[c].ask) artifacts[c].errors.push('Missing ask.json');
    if (!artifacts[c].turbo) artifacts[c].errors.push('Missing turbo.json');
  }

  // Market snapshot (Apify)
  const market = await generateMarketSnapshot({ outDir: OUT_DIR });

  // Optional: include market validation + framework audit if present
  const marketValidation = await safeReadJson(`${OUT_DIR}/market-validation.json`);
  const frameworkAudit = await safeReadJson(`${OUT_DIR}/framework-audit.json`);

  const combined = {
    generatedAt: new Date().toISOString(),
    artifacts,
    market,
    marketValidation: marketValidation || undefined,
    frameworkAudit: frameworkAudit || undefined,
  };
  await fs.writeFile(`${OUT_DIR}/combined.json`, JSON.stringify(combined, null, 2));

  const summary = {
    generatedAt: combined.generatedAt,
    categories: CATEGORIES.map((c) => ({
      category: c,
      ok: artifacts[c].errors.length === 0,
      recommendation: artifacts[c].ask?.recommendation || null,
      blockType: artifacts[c].turbo?.recommendation?.targetBlockType || null,
      usedFallback: Boolean(artifacts[c].turbo?.formatted?.usedFallback),
      errors: artifacts[c].errors,
      marketSources: market.categories[c]?.sources?.slice(0, 5) || [],
    })),
  };
  await fs.writeFile(`${OUT_DIR}/summary.json`, JSON.stringify(summary, null, 2));

  // HTML report
  const tabs = CATEGORIES.map((c) => {
    const turboBlock = artifacts[c].turbo?.formatted?.formattedBlock;
    return `
      <section class="tab" id="tab-${c}">
        <h2>${c}</h2>
        ${artifacts[c].errors.length ? `<div class="error">Missing: ${escapeHtml(artifacts[c].errors.join(', '))}</div>` : ''}

        <h3>Turbo block preview</h3>
        <div class="preview">${renderBlockPreview(turboBlock)}</div>

        <h3>Tool Recommendation</h3>
        <pre>${escapeHtml(JSON.stringify(artifacts[c].ask?.recommendation || artifacts[c].turbo?.recommendation || {}, null, 2))}</pre>

        <h3>Market sources (Apify)</h3>
        <ul>
          ${(market.categories[c]?.sources || [])
            .slice(0, 10)
            .map((s: any) => `<li><a href="${escapeHtml(String(s.url || '#'))}" target="_blank">${escapeHtml(String(s.title || s.url))}</a></li>`)
            .join('')}
        </ul>

        <details><summary>Raw JSON: product</summary><pre>${escapeHtml(JSON.stringify(artifacts[c].product || {}, null, 2))}</pre></details>
        <details><summary>Raw JSON: preset</summary><pre>${escapeHtml(JSON.stringify(artifacts[c].preset || {}, null, 2))}</pre></details>
        <details><summary>Raw JSON: ask</summary><pre>${escapeHtml(JSON.stringify(artifacts[c].ask || {}, null, 2))}</pre></details>
        <details><summary>Raw JSON: turbo</summary><pre>${escapeHtml(JSON.stringify(artifacts[c].turbo || {}, null, 2))}</pre></details>
      </section>`;
  }).join('\n');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GumGenie Production Test Report</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system; margin: 0; padding: 0; }
    header { position: sticky; top: 0; background: #111; color: #fff; padding: 12px 16px; z-index: 10; }
    nav { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    nav a { color: #fff; text-decoration: none; background: rgba(255,255,255,0.12); padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    main { padding: 16px; }
    .tab { padding: 12px; border: 2px solid #111; border-radius: 12px; margin-bottom: 16px; }
    .preview { padding: 10px; border: 1px solid #ddd; border-radius: 10px; background: #fafafa; }
    pre { overflow: auto; background: #0b1020; color: #e6e6e6; padding: 12px; border-radius: 10px; font-size: 12px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
    .card { border: 1px solid #ddd; border-radius: 10px; background: #fff; padding: 10px; }
    .card-title { font-weight: 900; }
    .card-price { color: #7c3aed; font-weight: 900; margin: 6px 0; }
    .error { background: #fee2e2; border: 1px solid #fecaca; padding: 10px; border-radius: 10px; }
    details { margin-top: 10px; }
  </style>
</head>
<body>
  <header>
    <div style="font-weight:900;">Production Test Report</div>
    <div style="opacity:0.85;font-size:12px;">Generated at: ${escapeHtml(combined.generatedAt)}</div>
    <nav>
      ${CATEGORIES.map((c) => `<a href="#tab-${c}">${c}</a>`).join('')}
    </nav>
  </header>
  <main>
    ${tabs}
  </main>
</body>
</html>`;

  await fs.writeFile(`${OUT_DIR}/report.html`, html);

  // Markdown report
  const md = buildMarkdownReport({ generatedAt: combined.generatedAt, artifacts, market });
  await fs.writeFile(`${OUT_DIR}/report.md`, md);

  // ZIPs
  const individualDir = `${OUT_DIR}/_bundle_individual`;
  const fullDir = `${OUT_DIR}/_bundle_full`;
  await fs.rm(individualDir, { recursive: true, force: true });
  await fs.rm(fullDir, { recursive: true, force: true });
  await fs.mkdir(individualDir, { recursive: true });
  await fs.mkdir(fullDir, { recursive: true });

  // individual: copy category artifacts
  for (const c of CATEGORIES) {
    for (const suffix of ['product.json', 'preset.json', 'ask.json', 'turbo.json', 'error.txt']) {
      const src = `${OUT_DIR}/${c}_${suffix}`;
      const dst = `${individualDir}/${c}_${suffix}`;
      try {
        await fs.copyFile(src, dst);
      } catch {
        // ignore
      }
    }
  }

  // full assembly
  for (const f of ['combined.json', 'summary.json', 'report.html', 'report.md', 'market-data.json']) {
    await fs.copyFile(`${OUT_DIR}/${f}`, `${fullDir}/${f}`);
  }
  for (const f of ['market-validation.json', 'market-validation.summary.json', 'framework-audit.json', 'framework-audit.txt']) {
    try {
      await fs.copyFile(`${OUT_DIR}/${f}`, `${fullDir}/${f}`);
    } catch {
      // ignore
    }
  }
  const fullArtifactsDir = `${fullDir}/artifacts`;
  await fs.mkdir(fullArtifactsDir, { recursive: true });
  for (const c of CATEGORIES) {
    for (const suffix of ['product.json', 'preset.json', 'ask.json', 'turbo.json', 'error.txt']) {
      const src = `${OUT_DIR}/${c}_${suffix}`;
      const dst = `${fullArtifactsDir}/${c}_${suffix}`;
      try {
        await fs.copyFile(src, dst);
      } catch {
        // ignore
      }
    }
  }

  await zipDirectory(individualDir, `${OUT_DIR}/individual-files.zip`);
  await zipDirectory(fullDir, `${OUT_DIR}/full-assembly.zip`);

  await fs.rm(individualDir, { recursive: true, force: true });
  await fs.rm(fullDir, { recursive: true, force: true });

  console.log(`Export complete: ${OUT_DIR}/report.html, ${OUT_DIR}/report.md, ${OUT_DIR}/*.zip`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
