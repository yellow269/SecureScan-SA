import { app } from './app';
import { env } from './config/env';

async function main() {
  app.listen(Number(env.PORT), () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on port ${env.PORT}`);
  });
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

