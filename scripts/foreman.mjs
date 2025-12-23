import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true });
}

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.rovodev',
  'production-test',
  'tmp-workflows',
]);

function listFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...listFiles(path.join(dir, e.name)));
    } else {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

function scanDeprecatedModels() {
  const files = listFiles(process.cwd())
    .filter((f) => /\.(ts|tsx|js|mjs|cjs)$/.test(f))
    .filter((f) => !f.endsWith(path.join('scripts', 'foreman.mjs')));

  const offenders = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    // Detect hard-coded deprecated model IDs in code (not docs/messages)
    if (txt.includes("'gemini-1.5-") || txt.includes('"gemini-1.5-')) offenders.push(f);
  }

  if (offenders.length) {
    console.error('Deprecated Gemini model IDs found (gemini-1.5-*).');
    offenders.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }
}

scanDeprecatedModels();

run('npm run lint');
run('npm run typecheck');

if (process.argv.includes('--build')) {
  run('npm run build');
}
