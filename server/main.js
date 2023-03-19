import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3900 });

// 监听 WebSocket 连接事件
wss.on("connection", (ws) => {
  console.log("client connected");

  // 监听客户端发送的消息
  ws.on("message", (message) => {
    console.log(`received: ${message}`);

    // 发送消息给客户端
    ws.send(`server received: ${message}`);
  });

  // 监听 WebSocket 连接断开事件
  ws.on("close", () => {
    console.log("client disconnected");
  });
});
