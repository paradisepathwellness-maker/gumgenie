import fs from 'node:fs/promises';

const BACKEND = 'http://127.0.0.1:4000';
const cat = 'DESIGN_TEMPLATES';

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt}`);
  return JSON.parse(txt);
}

const product = JSON.parse(await fs.readFile(`tmp-workflows/${cat}_product.json`, 'utf8'));
const preset = JSON.parse(await fs.readFile(`tmp-workflows/${cat}_preset.json`, 'utf8'));

const turbo = await postJson(`${BACKEND}/api/chat/orchestrate`, {
  message: 'Create an agency ROI calculator section that shows time saved and client value.',
  mode: 'turbo',
  context: { category: cat },
  product,
  preset,
});

await fs.writeFile(`tmp-workflows/${cat}_turbo.json`, JSON.stringify(turbo, null, 2));
console.log('Wrote tmp-workflows/DESIGN_TEMPLATES_turbo.json');
