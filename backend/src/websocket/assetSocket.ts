import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { getAllAssets } from '../services/assetService.js';

const WS_BROADCAST_INTERVAL_MS = 3000;

// function to create a WebSocket server for assets
function createWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws/assets' });

  // handle client connections
  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
  });

  // broadcast assets every 3 seconds
  setInterval(() => {
    if (wss.clients.size === 0) return;
    getAllAssets({})
    .then((assets) => {
        // stringify the assets and send to all connected clients
        const payload = JSON.stringify(assets);
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }
      })
      .catch((err: unknown) => {
        console.error('WebSocket DB query failed:', err);
      });
  }, WS_BROADCAST_INTERVAL_MS);
}

export default createWebSocketServer;
