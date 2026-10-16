export const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost';
export const PDF_QUEUE = process.env.PDF_QUEUE ?? 'pdf_queue';
export const TIMEOUT_MS = Number(process.env.PDF_TIMEOUT_MS) || 90_000;

// Not configurable: must be identical for every process using the queue
export const QUEUE_OPTIONS = {
  durable: true,
  arguments: { 'x-queue-type': 'quorum' },
};
