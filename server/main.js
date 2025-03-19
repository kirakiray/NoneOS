import { WebSocketServer } from "ws";
import { ServerHandClient } from "./client.js";

export const createServer = async (options = {}) => {
  const wss = new WebSocketServer({ port: options.port || 5579 });

  wss.on("connection", function connection(ws) {
    const client = new ServerHandClient(ws);

    console.log("新的客户端连接", client);
  });

  console.log("WebSocket 服务器运行在 ws://localhost:5579");

  return wss;
};
