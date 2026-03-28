import amqplib from 'amqplib';

const EXCHANGE = 'cerebro';
const QUEUE = 'tle.ingest';

export async function startConsumer(): Promise<void> {
  const url = process.env['RABBITMQ_URL'];
  if (!url) {
    console.warn('RABBITMQ_URL not set — RabbitMQ consumer not started');
    return;
  }

  const connection = await amqplib.connect(url);
  const ch = await connection.createChannel();

  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertQueue(QUEUE, { durable: true });
  await ch.bindQueue(QUEUE, EXCHANGE, 'tle.ingest');

  ch.consume(QUEUE, (msg) => {
    if (!msg) return;
    // TO-DO : parse TLE, enrich position, upsert to DB
    console.log(`Consumer received TLE: ${msg.content.toString()}`);
    ch.ack(msg);
  });

  console.log('RabbitMQ consumer started');
}
