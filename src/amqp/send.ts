import amqp, { type Channel, type ConsumeMessage } from 'amqplib';
import { randomUUID } from 'node:crypto';
import type { PdfData } from '../pdfGeneration/generatePdfFromLatex';

const QUEUE = 'pdf_queue';
const REPLY_TO = 'amq.rabbitmq.reply-to';
const TIMEOUT_MS = 90_000;

type Pending = {
  resolve: (pdf: Buffer) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};
const pending = new Map<string, Pending>(); // correlationId → waiting request

let channel: Channel;

export async function startPdfClient() {
  const connection = await amqp.connect('amqp://localhost');
  channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: { 'x-queue-type': 'quorum' },
  });
  await channel.consume(REPLY_TO, handleReply, { noAck: true }); // the one reply listener
}

function handleReply(message: ConsumeMessage | null) {
  if (!message) return;
  const id = message.properties.correlationId;
  const request = pending.get(id);
  if (!request) return; // reply arrived after its request timed out

  pending.delete(id);
  clearTimeout(request.timer);
  if (message.properties.headers?.status === 200) {
    request.resolve(message.content);
  } else {
    request.reject(new Error(message.content.toString()));
  }
}

export async function requestPdf(data: PdfData): Promise<Buffer> {
  const correlationId = randomUUID();
  const { promise, resolve, reject } = Promise.withResolvers<Buffer>();

  const timer = setTimeout(() => {
    pending.delete(correlationId);
    reject(new Error('PDF generation timed out'));
  }, TIMEOUT_MS);
  pending.set(correlationId, { resolve, reject, timer });

  channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(data)), {
    correlationId,
    replyTo: REPLY_TO,
    contentType: 'application/json',
    persistent: true,
  });

  return promise;
}
