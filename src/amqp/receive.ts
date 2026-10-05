import amqp from 'amqplib';

const QUEUE_OPTIONS = {
  durable: true,
  arguments: { 'x-queue-type': 'quorum' },
};

export async function startReceivers(queueName: string, count: number) {
  const connection = await amqp.connect('amqp://localhost'); // one connection...

  for (let i = 1; i <= count; i++) {
    const channel = await connection.createChannel(); // ...one channel per receiver
    await channel.assertQueue(queueName, QUEUE_OPTIONS);
    await channel.prefetch(1); // each receiver handles one message at a time

    await channel.consume(
      queueName,
      async (message) => {
        if (!message) return;
        console.log(` [receiver ${i}] Received ${message.content.toString()}`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // pretend to work
        console.log(` [receiver ${i}] Done`);
        channel.ack(message); // tell RabbitMQ it's finished, so it sends the next one
      },
      { noAck: false },
    );
  }

  console.log(
    ` [*] ${count} receivers waiting in ${queueName}. To exit press CTRL+C`,
  );
}
