import { startServer } from './server/server';
import { startReceivers } from './amqp/receive';
import os from 'node:os';
import { PDF_QUEUE } from './amqp/config';

async function main() {
  const role = process.env.ROLE ?? 'all';
  if (!['all', 'api', 'worker'].includes(role)) {
    throw new Error(`Unknown ROLE "${role}" (expected all, api or worker)`);
  }
  const concurrency =
    Number(process.env.WORKER_CONCURRENCY) || os.availableParallelism();

  if (role === 'all' || role === 'worker') {
    await startReceivers(PDF_QUEUE, concurrency);
  }
  if (role === 'all' || role === 'api') {
    await startServer();
  }
}

main().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
