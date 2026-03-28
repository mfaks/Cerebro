import amqplib from 'amqplib';

const EXCHANGE = 'cerebro';
let channel: amqplib.Channel | null = null;

// Get or create a RabbitMQ channel for published messages
// Caches the channel for reuse across multiple publish calls
async function getChannel(): Promise<amqplib.Channel> {
  if (channel) return channel;

  const url = process.env['RABBITMQ_URL'];
  if (!url) throw new Error('RABBITMQ_URL environment variable is required');

  const connection = await amqplib.connect(url);
  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  return channel;
}

export async function publish(routingKey: string, payload: unknown): Promise<void> {
  const ch = await getChannel();
  ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
}
