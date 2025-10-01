#!/usr/bin/env node

// index.js - WebSocket服务器入口文件
import { WebSocketServer } from "./ws-server.js";

// 定义消息处理函数
function handleMessage(ws, message) {
  switch (message.type) {
    case "echo":
      // 回显消息
      ws.send(
        JSON.stringify({
          type: "echo",
          message: message.message,
          timestamp: new Date().toISOString(),
        })
      );
      break;

    case "broadcast":
      // 广播消息给所有连接的客户端
      server._broadcastMessage(message);
      break;

    default:
      ws.send(
        JSON.stringify({
          type: "error",
          message: "未知的消息类型",
        })
      );
  }
}

// 创建WebSocket服务器实例，传入消息处理函数
const server = new WebSocketServer(handleMessage);

// 启动服务器，监听18290端口
server.start(18290);

// 优雅关闭服务器
process.on("SIGINT", () => {
  console.log("\n正在关闭服务器...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n正在关闭服务器...");
  server.stop();
  process.exit(0);
});

console.log("WebSocket服务器已启动，按 Ctrl+C 关闭服务器");
