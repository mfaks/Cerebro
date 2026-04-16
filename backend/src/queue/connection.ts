import amqplib from 'amqplib';

export const EXCHANGE = 'cerebro';

let connection: amqplib.ChannelModel | null = null;

// function to get the connection to the RabbitMQ server
export async function getConnection(): Promise<amqplib.ChannelModel> {
  if (connection) return connection;
  const url = process.env['RABBITMQ_URL'];
  if (!url) throw new Error('RABBITMQ_URL environment variable is required');
  connection = await amqplib.connect(url);
  return connection;
}

// function to close the connection to the RabbitMQ server
export async function closeConnection(): Promise<void> {
  await connection?.close();
  connection = null;
}
