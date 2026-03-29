import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { getAllAssets } from '../services/assetService.js';

function createWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws/assets' });

  wss.on('connection', (ws) => {
    console.log('Client connected');

    const interval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      getAllAssets({})
        .then((assets) => {
          ws.send(JSON.stringify(assets));
        })
        .catch((err: unknown) => {
          console.error('WebSocket DB query failed:', err);
        });
    }, 3000);

    ws.on('close', () => {
      console.log('Client disconnected');
      clearInterval(interval);
    });
  });
}

export default createWebSocketServer;
