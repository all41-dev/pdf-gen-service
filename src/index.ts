import { startServer } from './server/server';
import { startReceivers } from './amqp/receive';
import os from 'node:os';

async function main() {
  const role = process.env.ROLE ?? 'all';
  if (!['all', 'api', 'worker'].includes(role)) {
    throw new Error(`Unknown ROLE "${role}" (expected all, api or worker)`);
  }
  const concurrency =
    Number(process.env.WORKER_CONCURRENCY) || os.availableParallelism();

  if (role === 'all' || role === 'worker') {
    await startReceivers('pdf_queue', concurrency);
  }
  if (role === 'all' || role === 'api') {
    startServer();
  }
}

main().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
