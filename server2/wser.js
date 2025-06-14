const server = Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
    }
    return new Response("Hello world!");
  },
  websocket: {
    open(ws) {
      console.log("WebSocket opened");
    },
    message(ws, message) {
      console.log(`Received: ${message}`);
      ws.send(`Echo: ${message}`);
    },
    close(ws, code, message) {
      console.log("WebSocket closed");
    },
    drain(ws) {},
  },
});

console.log(`Listening on http://localhost:${server.port}`);
