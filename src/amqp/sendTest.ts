import amqp from 'amqplib';

async function main() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  await channel.assertQueue('pdf_queue', {
    durable: true,
    arguments: { 'x-queue-type': 'quorum' },
  });

  for (let i = 1; i <= 6; i++) {
    channel.sendToQueue('pdf_queue', Buffer.from(`job ${i}`), {
      persistent: true,
    });
  }
  console.log(' [x] Sent 6 messages');

  await channel.close();
  await connection.close();
}

main().catch(console.error);
