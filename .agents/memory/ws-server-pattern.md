---
name: WebSocket server pattern (Express + ws)
description: How to attach a ws WebSocket server to an Express app in this monorepo
---

**Rule:** Use `http.createServer(app)` + `WebSocketServer({ noServer: true })` + `server.on('upgrade', ...)` instead of passing the express app directly to ws.

**Why:** Express 5 / the monorepo's `app.ts` exports a plain Express instance; calling `new WebSocketServer({ server: app })` fails because `app` is not an http.Server.

**How to apply:**
```ts
const server = http.createServer(app);
const wss = createRideSocket(); // noServer: true inside
server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/api/ws")) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});
server.listen(port, ...);
```
