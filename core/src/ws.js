import { WebSocketServer } from "ws";

const HEARTBEAT_INTERVAL_MS = 30_000;

export function createRealtimeHub() {
  const clients = new Map();
  let nextClientId = 1;

  function broadcast(event) {
    const payload = JSON.stringify({ ...event, ts: event.ts || new Date().toISOString() });
    for (const client of clients.values()) {
      if (client.socket.readyState === client.socket.OPEN) {
        client.socket.send(payload);
      }
    }
  }

  function close() {
    for (const client of clients.values()) {
      client.socket.close();
    }
    clients.clear();
  }

  return {
    clients,
    broadcast,
    close,
    count() {
      return clients.size;
    },
    add(socket, req) {
      const clientId = `ws-${nextClientId++}`;
      const url = new URL(req.url, "http://core");
      const token = url.searchParams.get("token") || "";
      const client = { id: clientId, socket, token, connectedAt: Date.now(), isAlive: true };
      clients.set(clientId, client);

      socket.on("pong", () => {
        client.isAlive = true;
      });
      socket.on("close", () => {
        clients.delete(clientId);
      });
      socket.on("error", () => {
        clients.delete(clientId);
      });
      socket.send(JSON.stringify({ type: "connected", clientId, ts: new Date().toISOString() }));
    }
  };
}

export function attachWebSocketServer(server, { hub = createRealtimeHub(), path = "/ws" } = {}) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "", "http://core");
    if (url.pathname !== path) {
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      hub.add(ws, req);
      wss.emit("connection", ws, req);
    });
  });

  const heartbeat = setInterval(() => {
    for (const client of hub.clients.values()) {
      if (!client.isAlive) {
        client.socket.terminate();
        hub.clients.delete(client.id);
        continue;
      }
      client.isAlive = false;
      client.socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref?.();

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  return { wss, hub };
}
