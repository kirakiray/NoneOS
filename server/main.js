import { WebSocketServer } from "ws";
import { ServerHandClient } from "./client.js";

export const createServer = async (options = {}) => {
  const wss = new WebSocketServer({ port: options.port || 5579 });

  wss.on("connection", function connection(ws) {
    console.log("新的客户端连接");

    new ServerHandClient(ws);

    // 发送欢迎消息
    // ws.send("欢迎连接到 WebSocket 服务器！");
  });

  console.log("WebSocket 服务器运行在 ws://localhost:5579");

  return wss;
};
