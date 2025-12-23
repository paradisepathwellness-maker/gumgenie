import './loadEnvLocal';
import { runMarketValidation } from './marketValidation';

runMarketValidation('production-test').catch((e) => {
  console.error(e);
  process.exit(1);
});
