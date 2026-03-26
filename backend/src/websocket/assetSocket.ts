import WebSocket, { WebSocketServer } from "ws";
import { Server } from "http";

function createWebSocketServer(server: Server) {
    const wss = new WebSocketServer({ server, path: "/ws/assets" });

    wss.on("connection", (ws) => {
        console.log("Client connected");

        // Send mock asset data to the client every 3 seconds
        const interval = setInterval(() => {
        const update = {
            id: "25544",
            position: {
            latitude: 51.6 + Math.random() * 2,
            longitude: -120.3 + Math.random() * 2,
            altitude: 408.5,
            },
            lastUpdated: new Date().toISOString(),
        };

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(update));
        }
        }, 3000);

        ws.on("close", () => {
            console.log("Client disconnected");
            clearInterval(interval);
        });
    });
}

export default createWebSocketServer;