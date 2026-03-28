import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { collectDefaultMetrics, Registry } from 'prom-client';
import createWebSocketServer from './websocket/assetSocket.js';
import assetsRouter from './routes/assets.js';
import coverageRouter from './routes/coverage.js';
import eventsRouter from './routes/events.js';
import ingestRouter from './routes/ingest.js';
import { startConsumer } from './queue/consumer.js';

const app = express();
const server = createServer(app);
const PORT = Number(process.env['PORT'] ?? 3000);

const register = new Registry();
collectDefaultMetrics({ register });

// Redis client for rate-limit store
const redisUrl = process.env['REDIS_URL'];
if (!redisUrl) throw new Error('REDIS_URL environment variable is required');
const redisClient = createClient({ url: redisUrl });
await redisClient.connect();

// Apply a rate limiter to all API routes with Redis store of 50 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
});

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Apply rate limiter to all API routes
app.use('/api/v1', limiter);

app.use('/api/v1/assets', assetsRouter);
app.use('/api/v1/coverage', coverageRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/ingest', ingestRouter);

createWebSocketServer(server);
await startConsumer();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cerebro API running on http://localhost:${PORT}`);
});
