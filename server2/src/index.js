#!/usr/bin/env node

// index.js - WebSocket服务器入口文件
import { WebSocketServer } from "./ws-server.js";
import { HandClient } from "./hand-client.js";
import adminHandle from "./admin-handle.js";
import clientHandle from "./client-handle.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const packageJson = require("../package.json");

export const initServer = async ({
  password,
  port = 8081,
  serverName = "hand server",
}) => {
  let server;
  const clients = new Map();

  // 定义连接处理函数
  function onConnect(ws) {
    const client = new HandClient(ws, { clients }); // 传递 clients Map 给 HandClient
    ws._client = client;
    clients.set(client.cid, client);
    console.log("新客户端已连接: ", client.cid);

    client.send({
      type: "need_auth",
      cid: client.cid,
      time: new Date().toISOString(),
    });

    // 发送服务端的数据给对方
    // 兼容操作 旧版本客户端
    client.send({
      type: "update-server-info",
      data: {
        serverName,
        serverVersion: packageJson.version,
      },
    });
  }

  // 定义连接关闭处理函数
  function onClose(ws, code, reason) {
    // TODO: 同步应该记录下关闭连接的客户端信息
    // 从Map中移除断开连接的客户端
    clients.delete(ws._client.cid);
  }

  // 定义错误处理函数
  function onError(ws, error) {
    // TODO: 应该记录下错误信息
    if (ws._client) {
      clients.delete(ws._client.cid);
    }
  }

  // 定义消息处理函数
  function onMessage(ws, message) {
    const client = ws._client;

    if (clientHandle[message.type]) {
      clientHandle[message.type]({ client, clients, message });
      return;
    }

    switch (message.type) {
      case "ping":
        // 处理客户端的ping消息，返回pong响应
        client.send({
          type: "pong",
          timestamp: new Date().toISOString(),
        });
        break;

      case "echo":
        // 回显消息
        client.send({
          type: "echo",
          message: message.message,
          timestamp: new Date().toISOString(),
        });
        break;

      case "get_connections":
      case "disconnect_client":
        // 验证密码，通过才允许获取所有连接的客户端信息
        if (message.password !== password) {
          client.send({
            type: "error",
            message: "密码错误",
          });
          break;
        }

        // 调用 adminHandle 中的方法处理消息
        adminHandle[message.type]({ client, clients, message });
        break;

      default:
        client.send({
          type: "error",
          message: "未知的消息类型",
          response: message,
        });
    }
  }

  // 创建WebSocket服务器实例，使用option对象传入处理函数
  server = new WebSocketServer({
    onMessage,
    onConnect,
    onClose,
    onError,
  });

  // 将 clients Map 添加到 server 实例上，以便 HandClient 可以访问
  server.clients = clients;

  // 启动服务器，监听指定端口
  server.start(port);

  return server;
};
