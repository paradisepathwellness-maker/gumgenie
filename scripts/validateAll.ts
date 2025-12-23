import './loadEnvLocal';
import { runMarketValidation } from './marketValidation';
import { runFrameworkAudit } from './frameworkAudit';

async function main() {
  await runMarketValidation('production-test');
  await runFrameworkAudit('production-test');
  // Re-export the production-test report so artifacts land in zips/html/md
  await import('./exportProductionTest');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
