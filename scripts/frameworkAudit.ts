import './loadEnvLocal';
import fs from 'node:fs/promises';

type Category = 'AI_PROMPTS' | 'NOTION_TEMPLATES' | 'DIGITAL_PLANNERS' | 'DESIGN_TEMPLATES';

type AuditResult = {
  generatedAt: string;
  claims: {
    id: string;
    claim: string;
    status: 'Supported' | 'Weakly supported' | 'Contradicted' | 'Unknown';
    evidence: string[];
    recommendedChange: string;
  }[];
  beforeAfter: {
    before: string[];
    after: string[];
  };
};

function existsNonEmpty(arr?: any[]) {
  return Array.isArray(arr) && arr.length > 0;
}

export async function runFrameworkAudit(outDir = 'production-test') {
  const raw = await fs.readFile(`${outDir}/market-validation.json`, 'utf8');
  const validation = JSON.parse(raw) as any;

  const claims: AuditResult['claims'] = [];

  // Claim: Delivery expects ZIP / download all friction
  const zipEvidence: string[] = [];
  for (const c of Object.keys(validation.categories) as Category[]) {
    const top = validation.categories[c].deliveryExpectations?.slice(0, 10) || [];
    if (top.some((x: any) => String(x.phrase).includes('zip|download all'))) zipEvidence.push(`${c}: zip/download all shows up in delivery signals`);
  }

  claims.push({
    id: 'delivery-zip',
    claim: 'Buyers prefer a single ZIP / “download all” convenience and get frustrated by multi-file downloads.',
    status: zipEvidence.length >= 2 ? 'Supported' : zipEvidence.length === 1 ? 'Weakly supported' : 'Unknown',
    evidence: zipEvidence,
    recommendedChange: 'Default delivery: Full_Package.zip + Start Here page; keep individual files optional.',
  });

  // Claim: Setup confusion is a recurring pain point
  const setupEvidence: string[] = [];
  for (const c of Object.keys(validation.categories) as Category[]) {
    const pp = validation.categories[c].painPoints?.slice(0, 20) || [];
    if (pp.some((x: any) => String(x.phrase).includes('setup|onboarding|import guide|duplicate link'))) setupEvidence.push(`${c}: setup/onboarding/import signals present`);
  }

  claims.push({
    id: 'setup-friction',
    claim: 'Setup friction is a common reason for dissatisfaction; products need “Start Here” onboarding.',
    status: setupEvidence.length >= 2 ? 'Supported' : setupEvidence.length === 1 ? 'Weakly supported' : 'Unknown',
    evidence: setupEvidence,
    recommendedChange: 'Require Start Here page + 3-step quickstart + app/tool-specific import guidance.',
  });

  // Claim: Licensing clarity matters (esp. design templates)
  const licenseEvidence: string[] = [];
  for (const c of Object.keys(validation.categories) as Category[]) {
    const pp = validation.categories[c].painPoints?.slice(0, 20) || [];
    if (pp.some((x: any) => String(x.phrase).includes('license|commercial license|usage rights'))) licenseEvidence.push(`${c}: licensing appears in pain points`);
  }

  claims.push({
    id: 'licensing',
    claim: 'Licensing clarity is a frequent buyer concern (especially design templates).',
    status: licenseEvidence.length ? 'Weakly supported' : 'Unknown',
    evidence: licenseEvidence,
    recommendedChange: 'Always include License page + license.txt; include allowed/not allowed checklist.',
  });

  const before = [
    'Validation based primarily on assumptions + general best practices.',
    'Copy and delivery decisions not explicitly tied to extracted objections.',
  ];

  const after = [
    'Validation uses Apify+SerpAPI signals to ground copy, FAQ, and delivery structure.',
    'Quality gate includes “must-have” sections derived from real objections (download, setup, license).',
    'Delivery default: ZIP + Start Here + Pages + folders; category-specific import/duplicate guidance.',
  ];

  const audit: AuditResult = {
    generatedAt: new Date().toISOString(),
    claims,
    beforeAfter: { before, after },
  };

  await fs.writeFile(`${outDir}/framework-audit.json`, JSON.stringify(audit, null, 2));

  const txt = [
    `Framework audit generated at: ${audit.generatedAt}`,
    '',
    ...audit.claims.map((c) => `- ${c.id}: ${c.status}\n  Claim: ${c.claim}\n  Evidence: ${c.evidence.join('; ') || 'none'}\n  Change: ${c.recommendedChange}`),
    '',
    'BEFORE:',
    ...before.map((x) => `- ${x}`),
    '',
    'AFTER:',
    ...after.map((x) => `- ${x}`),
    '',
  ].join('\n');

  await fs.writeFile(`${outDir}/framework-audit.txt`, txt);
  return audit;
}

// Run when invoked directly via tsx/node
if (process.argv[1] && process.argv[1].includes('frameworkAudit')) {
  runFrameworkAudit().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
