import amqp from 'amqplib';
import type { PdfData } from '../generatePdfFromLatex';
export async function sendMessageToQueue(queueName: string, message: PdfData) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-queue-type': 'quorum',
    },
  });

  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
  console.log(' [x] Sent %s', message);
}
