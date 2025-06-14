import { serve } from "bun";

export const initServer = (options = {}) => {
  //   options = {
  //     port: 5579,
  //     name: "local-test-handserver",
  //     admin: [],
  //   };

  const server = serve({
    development: true,
    port: options.port,
    fetch(req, server) {
      const url = new URL(req.url);
      if (url.pathname === "/") {
        const success = server.upgrade(req);
        if (success) {
          return undefined;
        }
      }
      return new Response("Hello world!");
    },
    websocket: {
      open(ws) {
        console.log("WebSocket opened4");
      },
      message(ws, message) {
        console.log(`Received: ${message}`);
        ws.send(`Echo: ${message}`);
      },
      close(ws, code, message) {
        console.log("WebSocket closed4");
      },
      drain(ws) {},
    },
  });

  return server;
};
