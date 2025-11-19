#!/usr/bin/env node

// index.js - WebSocket服务器入口文件
import { WebSocketServer } from "./ws-server.js";
import { DeviceClient } from "./device-client.js";
import adminHandle from "./admin-handle.js";
import normalHandle from "./normal-handle.js";
import { createRequire } from "node:module";
import { unpack } from "../../packages/user/util/pack.js";

const require = createRequire(import.meta.url);

const packageJson = require("../package.json");

export const initServer = async ({
  password,
  port = 8081,
  serverName = "handserver",
}) => {
  let server;
  const clients = new Map(); // 用户cid索引数据
  const users = new Map(); // 用户userId索引数据
  const followIndex = new Map(); // 反向索引：被关注用户ID -> 关注者用户ID列表

  // 定义连接处理函数
  function onConnect(ws) {
    const client = new DeviceClient(ws, server, users, followIndex); // 传递 clients Map 和 followIndex 给 DeviceClient
    ws._client = client;
    clients.set(client.cid, client);
    console.log("新客户端已连接: ", client.cid);

    client._authTimer = setTimeout(() => {
      client.close();
    }, 1000 * 5); // 5秒未认证则关闭连接

    client.send({
      type: "need_auth",
      cid: client.cid,
      time: new Date().toISOString(),
    });

    // 发送服务端的数据给对方
    // TODO: 兼容操作 旧版本客户端，以后到时间，就要删除这个代码
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

    if (ws._client.userId) {
      const userData = users.get(ws._client.userId);
      const { userPool } = userData;

      if (userPool) {
        userPool.delete(ws._client);

        if (userPool.size === 0) {
          // 没有tab了，删除用户
          users.delete(ws._client.userId);

          // 清理反向索引：移除该用户的所有关注关系
          const followUsers = userData.followUsers || [];
          for (const followedUserId of followUsers) {
            const followers = followIndex.get(followedUserId);
            if (followers) {
              const index = followers.indexOf(ws._client.userId);
              if (index > -1) {
                followers.splice(index, 1);
                // 如果该用户没有关注者了，删除索引条目
                if (followers.length === 0) {
                  followIndex.delete(followedUserId);
                }
              }
            }
          }

          // 通知关注列表用户，该用户下线了
          const followers = followIndex.get(ws._client.userId);
          if (followers) {
            for (const followerId of followers) {
              const followerUser = users.get(followerId);
              if (followerUser && followerUser.userPool) {
                followerUser.userPool.forEach((userClient) => {
                  userClient.send({
                    type: "notify_follow",
                    online: [],
                    offline: [ws._client.userId],
                    message: "你关注的用户下线了",
                  });
                });
              }
            }
          }
        }
      }
    }
  }

  // 定义错误处理函数
  function onError(ws, error) {
    // TODO: 应该记录下错误信息
    if (ws._client) {
      onClose(ws);
    }
  }

  // 定义消息处理函数
  function onMessage(ws, message) {
    const client = ws._client;

    // 二进制数据
    let binaryData = null;

    if (message instanceof Buffer) {
      const { obj, data } = unpack(message);

      binaryData = data;
      message = obj;
    }

    try {
      if (normalHandle[message.type]) {
        normalHandle[message.type]({
          client,
          clients,
          users,
          followIndex,
          message,
          binaryData,
        });
        return;
      }
    } catch (error) {
      client.send({
        type: "error",
        message: "消息格式错误",
        response: message,
      });
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

  // 将 clients Map 添加到 server 实例上，以便 DeviceClient 可以访问
  server.clients = clients;
  server.users = users;
  server.followIndex = followIndex;
  server.serverName = serverName;
  server.serverVersion = packageJson.version;

  // 启动服务器，监听指定端口
  server.start(port);

  return server;
};
