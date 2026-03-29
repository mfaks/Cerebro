import amqplib from 'amqplib';
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';
import { upsertAsset } from '../services/assetService.js';
import type { Asset, TLEPayload } from '../types/types.js';

const EXCHANGE = 'cerebro';
const QUEUE = 'tle.ingest';
const DLQ = 'tle.ingest.dlq';

export async function startConsumer(): Promise<void> {
  const url = process.env['RABBITMQ_URL'];
  if (!url) {
    console.warn('RABBITMQ_URL not set — RabbitMQ consumer not started');
    return;
  }

  const connection = await amqplib.connect(url);
  const ch = await connection.createChannel();

  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertQueue(DLQ, { durable: true });
  await ch.assertQueue(QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': DLQ,
    },
  });
  await ch.bindQueue(QUEUE, EXCHANGE, 'tle.ingest');

  ch.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as TLEPayload;
      const asset = tleToAsset(payload);
      await upsertAsset(asset);
      ch.ack(msg);
      console.log(`Processed TLE for asset ${asset.id} (${asset.name})`);
    } catch (err) {
      console.error('Failed to process TLE message:', err);
      ch.nack(msg, false, false);
    }
  });

  console.log('RabbitMQ consumer started');
}

function tleToAsset(payload: TLEPayload): Asset {
  const satrec = twoline2satrec(payload.line1, payload.line2);

  const now = new Date();
  const posVel = propagate(satrec, now);

  if (satrec.error !== 0) {
    throw new Error(
      `SGP4 propagation error ${satrec.error.toString()} for ${payload.name}`,
    );
  }

  const gmst = gstime(now);
  const geodetic = eciToGeodetic(posVel.position, gmst);

  const lat = degreesLat(geodetic.latitude);
  const lon = degreesLong(geodetic.longitude);
  const altKm = geodetic.height;

  const vel = posVel.velocity;
  const speedKms = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

  const inclDeg = (satrec.inclo * 180) / Math.PI;
  const catalogId = payload.line1.substring(2, 7).trim();

  return {
    id: catalogId,
    name: payload.name,
    type: 'PAYLOAD',
    status: 'ACTIVE',
    position: { latitude: lat, longitude: lon, altitude: altKm },
    velocity: { speed: speedKms, heading: inclDeg },
    lastUpdated: now.toISOString(),
    metadata: {
      country: 'TBD',
      launchDate: null,
      rcsSize: 'MEDIUM',
    },
  };
}
