#!/usr/bin/env node

import { WebSocketServer } from "./websocket-server.js";
import { ClientManager } from "./client-manager.js";
import { MessageRouter } from "./message-router.js";
import { Client } from "./client.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

export const initServer = async ({
  password,
  port = 8081,
  serverName = "handserver",
}) => {
  // 初始化管理器
  const clientManager = new ClientManager();
  const messageRouter = new MessageRouter(clientManager, password);

  // WebSocket事件处理函数
  function onConnect(ws) {
    const client = new Client(ws, server, clientManager);
    
    clientManager.addClient(client);
    console.log("新客户端已连接:", client.cid);

    // 发送认证请求
    client.sendNeedAuth();
    
    // 兼容旧版本客户端
    client.sendServerUpdateInfo(serverName, packageJson.version);
  }

  function onClose(ws, code, reason) {
    const client = ws._client;
    if (client) {
      console.log("客户端断开连接:", client.cid);
      clientManager.removeClient(client.cid);
    }
  }

  function onError(ws, error) {
    console.error("WebSocket错误:", error);
    const client = ws._client;
    if (client) {
      onClose(ws);
    }
  }

  async function onMessage(ws, message) {
    await messageRouter.handleMessage(ws, message);
  }

  // 创建WebSocket服务器
  const server = new WebSocketServer({
    onMessage,
    onConnect,
    onClose,
    onError,
  });

  // 添加服务器属性
  server.serverName = serverName;
  server.serverVersion = packageJson.version;

  // 启动服务器
  server.start(port);
  
  console.log(`NoneOS WebSocket服务器启动`);
  console.log(`服务器名称: ${serverName}`);
  console.log(`版本: ${packageJson.version}`);
  console.log(`监听端口: ${port}`);

  return server;
};

// 如果是直接运行此文件，则启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  const password = process.env.SERVER_PASSWORD || "noneos-server-password";
  const port = parseInt(process.env.PORT || "8081");
  const serverName = process.env.SERVER_NAME || "handserver";

  initServer({ password, port, serverName }).catch(error => {
    console.error("启动服务器失败:", error);
    process.exit(1);
  });
}