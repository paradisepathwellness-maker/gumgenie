import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.APIFY_TOKEN;
if (!token) throw new Error('Missing APIFY_TOKEN');

const actorId = process.env.APIFY_GUMROAD_SEARCH_ACTOR_ID || 'easyapi/gumroad-search-scraper';

async function run(input) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(token)}&waitForFinish=60`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  const txt = await res.text();
  console.log('\nINPUT', JSON.stringify(input));
  console.log('STATUS', res.status);
  if (!res.ok) {
    console.log(txt);
    return;
  }
  const json = JSON.parse(txt);
  const datasetId = json?.data?.defaultDatasetId;
  console.log('DATASET', datasetId);
  const ds = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=true&format=json`);
  const items = await ds.json();
  console.log('ITEMS', Array.isArray(items) ? items.length : typeof items);
  if (Array.isArray(items) && items[0]) console.log('SAMPLE_KEYS', Object.keys(items[0]));
  if (Array.isArray(items) && items[0]) console.log('SAMPLE', JSON.stringify(items[0]).slice(0,900));
}

// Try broad queries
await run({ query: 'template', maxItems: 10 });
await run({ query: 'notion', maxItems: 10 });
await run({ query: 'planner', maxItems: 10 });

// Try startUrls style
await run({ startUrls: [{ url: 'https://gumroad.com/discover?query=notion' }], maxItems: 10 });
await run({ startUrls: [{ url: 'https://gumroad.com/discover?query=template' }], maxItems: 10 });
