import { startServer } from './server';
import { startReceivers } from './amqp/receive';
import os from 'node:os';

async function main() {
  const role = process.env.ROLE ?? 'all';
  const concurrency =
    Number(process.env.WORKER_CONCURRENCY) || os.availableParallelism();

  if (role === 'all' || role === 'worker') {
    await startReceivers('pdf_queue', concurrency);
  }
  if (role === 'all' || role === 'api') {
    startServer();
  }
}

main();
