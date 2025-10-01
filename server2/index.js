#!/usr/bin/env node

// index.js - WebSocket服务器入口文件
import { WebSocketServer } from "./ws-server.js";

// 定义连接处理函数
function onConnect(ws) {
  console.log("新客户端已连接");
  // 可以在这里添加连接时的处理逻辑
}

// 定义消息处理函数
function onMessage(ws, message) {
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

// 定义连接关闭处理函数
function onClose(ws, code, reason) {
  console.log("客户端断开连接，代码:", code, "原因:", reason ? reason.toString() : "无");
  // 可以在这里添加连接关闭时的处理逻辑
}

// 定义错误处理函数
function onError(ws, error) {
  console.error("WebSocket错误:", error);
  // 可以在这里添加错误处理逻辑
}

// 创建WebSocket服务器实例，使用option对象传入处理函数
const server = new WebSocketServer({
  messageHandler: onMessage,
  connectHandler: onConnect,
  closeHandler: onClose,
  errorHandler: onError
});

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
