import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import createWebSocketServer from './websocket/assetSocket.js';

const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

createWebSocketServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cerebro API running on http://localhost:${PORT}`);
});