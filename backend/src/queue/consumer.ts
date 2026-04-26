import type amqplib from 'amqplib';
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';
import { getConnection, EXCHANGE } from './connection.js';
import { upsertAsset } from '../services/assetService.js';
import type { Asset, TLEPayload } from '../types/types.js';

const QUEUE = 'tle.ingest';
const DLQ = 'tle.ingest.dlq';

// function to start the consumer
export async function startConsumer(): Promise<void> {
  if (!process.env['RABBITMQ_URL']) {
    console.warn('RABBITMQ_URL not set — RabbitMQ consumer not started');
    return;
  }

  const conn = await getConnection();
  const ch = await conn.createChannel();

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

  ch.consume(QUEUE, async (msg: amqplib.ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as TLEPayload;
      const asset = tleToAsset(payload);
      await upsertAsset(asset);
      ch.ack(msg);
      console.log(`Processed TLE for asset ${asset.id} (${asset.name})`);
    } catch (err) {
      console.error('Failed to process TLE message:', err);
      // requeue=false routes the message to the DLQ instead of retrying indefinitely
      ch.nack(msg, false, false);
    }
  });

  // function to consume messages from the DLQ
  ch.consume(DLQ, (msg: amqplib.ConsumeMessage | null) => {
    if (!msg) return;
    console.error('DLQ message (unprocessable TLE):', msg.content.toString());
    ch.ack(msg);
  });

  console.log('RabbitMQ consumer started');
}

// function to convert a TLE payload to an asset
function tleToAsset(payload: TLEPayload): Asset {

  // convert the TLE payload to a satellite object using the SGP4 algorithm
  const satrec = twoline2satrec(payload.line1, payload.line2);

  if (satrec.error !== 0) {
    throw new Error(
      `SGP4 initialisation error ${satrec.error.toString()} for ${payload.name}`,
    );
  }

  const now = new Date();
  const posVel = propagate(satrec, now);
  const position = posVel.position;
  const vel = posVel.velocity;

  // check if the position and velocity are valid
  if (isNaN(position.x) || isNaN(vel.x)) {
    throw new Error(`SGP4 propagation returned no position/velocity for ${payload.name}`);
  }

  // convert the position and velocity to geodetic coordinates
  const gmst = gstime(now);
  const geodetic = eciToGeodetic(position, gmst);

  // convert the latitude and longitude to degrees
  const lat = degreesLat(geodetic.latitude);
  const lon = degreesLong(geodetic.longitude);
  const altKm = geodetic.height;
  const speedKms = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

  // convert the inclination to degrees
  const inclDeg = (satrec.inclo * 180) / Math.PI;

  // get the NORAD catalog number from the TLE line 1
  const catalogId = payload.line1.substring(2, 7).trim();

  // determine the object type based on the name
  const upperName = payload.name.toUpperCase();
  const objectType: Asset['type'] = upperName.includes('DEB')
    ? 'DEBRIS'
    : upperName.includes('R/B')
      ? 'ROCKET_BODY'
      : 'PAYLOAD';

  return {
    id: catalogId,
    name: payload.name,
    type: objectType,
    status: 'ACTIVE',
    position: { latitude: lat, longitude: lon, altitude: altKm },
    velocity: { speed: speedKms, inclination: inclDeg },
    lastUpdated: now.toISOString(),
    // country and rcsSize cannot be derived from TLE data
    metadata: {
      country: null,
      launchDate: null,
      rcsSize: null,
    },
  };
}
