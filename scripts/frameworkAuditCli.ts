import './loadEnvLocal';
import { runFrameworkAudit } from './frameworkAudit';

runFrameworkAudit('production-test').catch((e) => {
  console.error(e);
  process.exit(1);
});
