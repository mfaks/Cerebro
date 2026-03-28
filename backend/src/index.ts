import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import createWebSocketServer from './websocket/assetSocket.js';
import assetsRouter from './routes/assets.js';
import coverageRouter from './routes/coverage.js';
import eventsRouter from './routes/events.js';
import ingestRouter from './routes/ingest.js';
import { startConsumer } from './queue/consumer.js';

const app = express();
const server = createServer(app);
const PORT = Number(process.env['PORT'] ?? 3000);

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.use('/api/v1/assets', assetsRouter);
app.use('/api/v1/coverage', coverageRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/ingest', ingestRouter);

createWebSocketServer(server);
await startConsumer();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cerebro API running on http://localhost:${PORT}`);
});
