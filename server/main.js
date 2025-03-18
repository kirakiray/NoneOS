import { WebSocketServer } from "ws";

export const createServer = async (options = {}) => {
  const wss = new WebSocketServer({ port: options.port || 5579 });

  wss.on("connection", function connection(ws) {
    console.log("新的客户端连接");

    ws.on("message", function incoming(message) {
      console.log("收到消息:", message.toString());

      // 广播消息给所有客户端
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    });

    ws.on("close", () => {
      console.log("客户端断开连接");
    });

    // 发送欢迎消息
    ws.send("欢迎连接到 WebSocket 服务器！");
  });

  console.log("WebSocket 服务器运行在 ws://localhost:5579");

  return wss;
};
