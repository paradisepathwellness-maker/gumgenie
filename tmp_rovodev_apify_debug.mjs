import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.APIFY_TOKEN;
if (!token) throw new Error('Missing APIFY_TOKEN');

const actorId = process.env.APIFY_GUMROAD_SEARCH_ACTOR_ID || 'easyapi/gumroad-search-scraper';

async function run(input) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(token)}&waitForFinish=30`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  const txt = await res.text();
  console.log('ACTOR', actorId);
  console.log('INPUT', JSON.stringify(input));
  console.log('STATUS', res.status);
  console.log(txt);
}

await run({ queries: 'notion template', maxItems: 5 });
