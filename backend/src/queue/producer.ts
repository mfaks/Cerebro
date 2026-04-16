import type amqplib from 'amqplib';
import { getConnection, EXCHANGE } from './connection.js';

let channel: amqplib.Channel | null = null;

// function to get the channel to the RabbitMQ server
async function getChannel(): Promise<amqplib.Channel> {
  if (channel) return channel;
  const conn = await getConnection();
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  channel = ch;
  return ch;
}

// function to publish a message to the RabbitMQ server
export async function publish(routingKey: string, payload: unknown): Promise<void> {
  const ch = await getChannel();
  const ok = ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
  if (!ok) {
    console.warn('RabbitMQ channel buffer full — message may be dropped');
  }
}
