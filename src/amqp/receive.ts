import amqp, { ConsumeMessage, Channel } from 'amqplib';
import { generatePdfFromLatex } from '../pdfGeneration/generatePdfFromLatex';
import { PdfData } from '../pdfGeneration/generatePdfFromLatex';
const QUEUE_OPTIONS = {
  durable: true,
  arguments: { 'x-queue-type': 'quorum' },
};

async function handleJob(
  channel: Channel,
  message: ConsumeMessage,
  receiverId: number,
) {
  const { correlationId, replyTo } = message.properties;
  try {
    const job = JSON.parse(message.content.toString()) as PdfData;
    console.log(` [receiver ${receiverId}] job ${job.uuid}: generating`);
    const pdf = await generatePdfFromLatex(
      job.latexTemplate,
      job.uuid,
      job.images,
    );
    if (replyTo) {
      channel.sendToQueue(replyTo, pdf, {
        correlationId,
        contentType: 'application/pdf',
        headers: { status: 200 },
      });
    }
    console.log(` [receiver ${receiverId}] job ${job.uuid}: done`);
  } catch (error) {
    console.error(` [receiver ${receiverId}] job failed:`, error);
    if (replyTo) {
      channel.sendToQueue(
        replyTo,
        Buffer.from(JSON.stringify({ error: String(error) })),
        {
          correlationId,
          contentType: 'application/json',
          headers: { status: 500 },
        },
      );
    }
  } finally {
    channel.ack(message);
  }
}
export async function startReceivers(queueName: string, count: number) {
  const connection = await amqp.connect('amqp://localhost');

  for (let i = 1; i <= count; i++) {
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, QUEUE_OPTIONS);
    await channel.prefetch(1);

    await channel.consume(
      queueName,
      (message) => {
        if (message) void handleJob(channel, message, i);
      },
      { noAck: false },
    );
  }

  console.log(
    ` [*] ${count} receivers waiting in ${queueName}. To exit press CTRL+C`,
  );
}
