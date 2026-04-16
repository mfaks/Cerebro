import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { collectDefaultMetrics, Registry } from 'prom-client';
import createWebSocketServer from './websocket/assetSocket.js';
import assetsRouter from './routes/assets.js';
import coverageRouter from './routes/coverage.js';
import eventsRouter from './routes/events.js';
import ingestRouter from './routes/ingest.js';
import { startConsumer } from './queue/consumer.js';
import { startIngestionWorker } from './workers/ingestionWorker.js';

const app = express();
const server = createServer(app);
const PORT = Number(process.env['PORT'] ?? 3000);

const register = new Registry();
collectDefaultMetrics({ register });

const frontendUrl = process.env['FRONTEND_URL'];
if (!frontendUrl) throw new Error('FRONTEND_URL environment variable is required');


app.use(cors({ origin: frontendUrl }));
app.use(helmet());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/v1/assets', assetsRouter);
app.use('/api/v1/coverage', coverageRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/ingest', ingestRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

createWebSocketServer(server);
await startConsumer();
startIngestionWorker();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cerebro API running on http://localhost:${PORT}`);
});
