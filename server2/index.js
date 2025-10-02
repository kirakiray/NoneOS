#!/usr/bin/env node

// index.js - WebSocket服务器入口文件
import { WebSocketServer } from "./ws-server.js";

// 定义连接处理函数
function onConnect(ws) {
  console.log("新客户端已连接");
  // 可以在这里添加连接时的处理逻辑
}

const password = "admin123";

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

    case "ping":
      // 处理客户端的ping消息，返回pong响应
      ws.send(JSON.stringify({ type: "pong" }));
      break;

    case "get_connections":
      // 验证密码
      if (message.password !== password) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "密码错误",
          })
        );
        break;
      }

      // 获取所有连接的客户端信息
      const connectionsInfo = server.getConnectionsInfo();
      ws.send(
        JSON.stringify({
          type: "connections_info",
          clients: connectionsInfo,
        })
      );
      break;

    case "disconnect_client":
      // 断开指定客户端的连接
      if (message.clientId) {
        server.disconnectClient(message.clientId);

        ws.send(
          JSON.stringify({
            type: "success",
            message: `已断开客户端 ${message.clientId} 的连接`,
          })
        );
      } else {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "缺少客户端ID参数",
          })
        );
      }
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
  console.log(
    "客户端断开连接，代码:",
    code,
    "原因:",
    reason ? reason.toString() : "无"
  );
  // 可以在这里添加连接关闭时的处理逻辑
}

// 定义错误处理函数
function onError(ws, error) {
  console.error("WebSocket错误:", error);
  // 可以在这里添加错误处理逻辑
}

// 创建WebSocket服务器实例，使用option对象传入处理函数
const server = new WebSocketServer({
  onMessage,
  onConnect,
  onClose,
  onError,
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
