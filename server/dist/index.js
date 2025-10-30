#!/usr/bin/env node
import { createRequire } from "node:module";

// WebSocketServer.js
// 兼容 nodejs 和 bun 环境的 WebSocket 服务器类
class WebSocketServer {
  constructor(options = {}) {
    this.wss = null;

    // 解构options对象，设置默认值
    const { onMessage, onConnect, onClose, onError } = options;

    // 验证 onMessage 是否为函数
    if (typeof onMessage !== "function") {
      throw new Error("onMessage 必须是一个函数");
    }

    this.onMessage = onMessage; // 消息处理回调函数（必需）

    // 验证 onConnect 是否为函数（可选）
    if (onConnect && typeof onConnect !== "function") {
      throw new Error("onConnect 必须是一个函数");
    }

    this.onConnect = onConnect; // 连接处理回调函数（可选）

    // 验证 onClose 是否为函数（可选）
    if (onClose && typeof onClose !== "function") {
      throw new Error("onClose 必须是一个函数");
    }

    this.onClose = onClose; // 连接关闭处理回调函数（可选）

    // 验证 onError 是否为函数（可选）
    if (onError && typeof onError !== "function") {
      throw new Error("onError 必须是一个函数");
    }

    this.onError = onError; // 错误处理回调函数（可选）
  }

  /**
   * 启动WebSocket服务器
   * @param {number} port - 服务器监听端口
   */
  start(port = 8080) {
    if (typeof Bun !== "undefined") {
      this._startBunServer(port);
    } else {
      this._startNodeServer(port);
    }
  }

  /**
   * 在Bun环境下启动WebSocket服务器
   * @param {number} port - 服务器监听端口
   */
  _startBunServer(port) {
    console.log("使用Bun原生WebSocket服务器");

    // 创建WebSocket处理器
    const websocketHandler = {
      open: (ws) => {
        console.log("新的客户端连接");

        // 如果提供了连接处理回调函数，则调用它
        if (this.onConnect) {
          this.onConnect(ws);
        }
      },

      message: (ws, data) => {
        try {
          // 检查是否为二进制数据
          if (
            data instanceof ArrayBuffer ||
            data instanceof Uint8Array ||
            data instanceof Buffer ||
            (typeof data !== "string" && !(data instanceof String))
          ) {
            // 对于二进制数据或非字符串数据，直接传递给 onMessage 处理函数
            this.onMessage(ws, data);

            return;
          }

          // 解析客户端发送的JSON数据
          const message = JSON.parse(data);

          // 调用消息处理回调函数（现在是必需的）
          this.onMessage(ws, message);
        } catch (error) {
          console.error("处理消息时出错:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "消息格式错误",
            })
          );
        }
      },

      close: (ws, code, message) => {
        console.log("客户端断开连接:", code, message);

        // 如果提供了连接关闭处理回调函数，则调用它
        if (this.onClose) {
          this.onClose(ws, code, message);
        }
      },

      error: (ws, error) => {
        console.error("WebSocket错误:", error);

        // 如果提供了错误处理回调函数，则调用它
        if (this.onError) {
          this.onError(ws, error);
        }
      },
    };

    // 使用Bun.serve创建HTTP服务器并处理WebSocket连接
    this.server = Bun.serve({
      port: port,
      fetch: (req, server) => {
        // 升级到WebSocket连接
        if (server.upgrade(req)) {
          return; // 不返回响应，因为连接已升级为WebSocket
        }

        // 对于非WebSocket请求，返回404
        return new Response("无法找到该页面", { status: 404 });
      },

      websocket: websocketHandler,
    });

    console.log(`Bun WebSocket服务器启动，监听端口 ${port}`);
  }

  /**
   * 在Node.js环境下启动WebSocket服务器
   * @param {number} port - 服务器监听端口
   */
  async _startNodeServer(port) {
    console.log("使用Node.js ws库");

    try {
      const { WebSocketServer } = await import("ws");

      // 创建WebSocket服务器，监听在指定端口
      this.wss = new WebSocketServer({ port: port });

      console.log(`WebSocket服务器启动，监听端口 ${port}`);

      // 处理连接事件
      this.wss.on("connection", (ws, req) => {
        console.log("新的客户端连接");

        // 如果提供了连接处理回调函数，则调用它
        if (this.onConnect) {
          this.onConnect(ws);
        }

        // 监听客户端消息
        ws.on("message", (data, isBinary) => {
          try {
            // 检查是否为二进制数据
            if (isBinary) {
              // 对于二进制数据，直接传递给 onMessage 处理函数
              this.onMessage(ws, data);
              return;
            }

            // 解析客户端发送的JSON数据
            const message = JSON.parse(data.toString());

            // 调用消息处理回调函数（现在是必需的）
            this.onMessage(ws, message);
          } catch (error) {
            console.error("处理消息时出错:", error);
            ws.send(
              JSON.stringify({
                type: "error",
                message: "消息格式错误",
              })
            );
          }
        });

        // 监听连接关闭事件
        ws.on("close", (code, reason) => {
          console.log("客户端断开连接");

          // 如果提供了连接关闭处理回调函数，则调用它
          if (this.onClose) {
            this.onClose(ws, code, reason);
          }
        });

        // 监听错误事件
        ws.on("error", (err) => {
          console.error("WebSocket错误:", err);

          // 如果提供了错误处理回调函数，则调用它
          if (this.onError) {
            this.onError(ws, err);
          }
        });
      });
    } catch (error) {
      console.error("无法加载ws库:", error);
    }
  }

  /**
   * 停止WebSocket服务器
   */
  stop() {
    if (typeof Bun !== "undefined" && this.server) {
      this.server.stop();
      console.log("Bun WebSocket服务器已停止");
    } else if (this.wss) {
      this.wss.close();
      console.log("Node.js WebSocket服务器已停止");
    }
  }
}

class DeviceClient {
  constructor(ws, server) {
    if (ws._client) {
      throw new Error("客户端已经初始化过:" + ws._client.cid);
    }

    this.state = "unauth"; // 未认证：unauth；认证完成：authed
    this.userId = null; // 认证完成后设置用户ID
    this.publicKey = null; // 认证完成后设置用户公钥
    this.userInfo = null; // 认证完成后设置用户信息
    this.userSessionId = null; // 认证完成后设置用户会话ID
    this.delay = 0; // 延迟时间

    let cid = Math.random().toString(36).slice(2, 8);

    // 检查CID是否已存在
    while (server.clients.has(cid)) {
      cid = Math.random().toString(36).slice(2, 8);
    }

    this.cid = cid;
    this.ws = ws;
    this.server = server;
    this.connectTime = new Date(); // 记录连接时间
  }

  sendServerInfo() {
    this.send({
      type: "server_info",
      serverName: this.server.serverName,
      serverVersion: this.server.serverVersion,
      cid: this.cid,
    });
  }

  send(data) {
    // 判断是二进制则直接发送，对象则发送字符串
    if (
      data instanceof ArrayBuffer ||
      data instanceof Uint8Array ||
      data instanceof Buffer ||
      typeof data === "string"
    ) {
      this.ws.send(data);
    } else {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        debugger;
        console.error("发送数据失败:", error);
      }
    }
  }

  close() {
    this.ws.close();
  }

  toJSON() {
    return {
      cid: this.cid,
      userId: this.userId,
      userInfo: this.userInfo,
      userSessionId: this.userSessionId,
      connectTime: this.connectTime.toISOString(),
    };
  }
}

// 和服务端的交互，使用下划线驼峰命名法
const options$1 = {
  // 获取所有连接的客户端信息
  get_connections({ client, clients, message }) {
    let connectionsInfo = [];
    for (const client2 of clients.values()) {
      connectionsInfo.push({
        id: client2.cid,
        userId: client2.userId,
        userInfo: client2.userInfo,
        connectTime: client2.connectTime,
        state: client2.state,
        username: client2.userInfo.name,
        delay: client2.delay,
      });
    }
    client.send({
      type: "connections_info",
      clients: connectionsInfo,
    });
  },
  // 断开指定客户端的连接
  disconnect_client({ client, clients, message }) {
    if (message.clientId) {
      // 找到任意一个客户端实例来调用 disconnectClient 方法
      const targetClient = clients.get(message.clientId);
      if (targetClient) {
        targetClient.close();

        client.send({
          type: "success",
          message: `已断开客户端 ${message.clientId} 的连接`,
        });
      } else {
        client.send({
          type: "error",
          message: `未找到客户端 ${message.clientId}`,
        });
      }
    } else {
      client.send({
        type: "error",
        message: "缺少客户端ID参数",
      });
    }
  },
};

/**
 * ECDSA 签名相关工具函数
 */

/**
 * 导入公钥
 * @param {string} publicKeyBase64 - base64 编码的公钥
 * @returns {Promise<CryptoKey>} CryptoKey 对象
 */
async function importPublicKey(publicKeyBase64) {
  try {
    // 将 base64 转回二进制格式
    const binaryKey = Uint8Array.from(atob(publicKeyBase64), (c) =>
      c.charCodeAt(0)
    );

    // 导入公钥
    const publicKey = await crypto.subtle.importKey(
      "spki",
      binaryKey,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["verify"]
    );

    return publicKey;
  } catch (error) {
    console.error("公钥导入失败:", error);
    throw error;
  }
}

/**
 * 创建验证函数
 * @param {string} publicKeyBase64 - base64 编码的公钥
 * @returns {Promise<Function>} 验证函数
 */
const createVerifier = async (publicKeyBase64) => {
  try {
    const publicKey = await importPublicKey(publicKeyBase64);
    return (message, signature) => {
      const encoder = new TextEncoder();
      // 将消息转换为 Uint8Array
      const data = encoder.encode(message);
      // 使用公钥验证签名
      return crypto.subtle.verify(
        {
          name: "ECDSA",
          hash: { name: "SHA-256" },
        },
        publicKey,
        signature,
        data
      );
    };
  } catch (error) {
    console.error("创建验证函数失败:", error);
    throw error;
  }
};

const verify = async (signedData) => {
  const { signature, ...data } = signedData;
  const msg = JSON.stringify(data);

  const { publicKey } = data;

  // 生成验证器
  const verify = await createVerifier(publicKey);

  try {
    // 将 base64 转换回原始格式并验证签名
    const signatureBuffer = new Uint8Array(
      [...atob(signature)].map((c) => c.charCodeAt(0))
    ).buffer;

    const result = await verify(msg, signatureBuffer);

    return result;
  } catch (err) {
    // 抛出错误信息
    console.error(err);
    return false;
  }
};

/**
 * @file util.js
 * @author yao
 * 传入一个数据，计算哈希值
 * @param {ArrayBuffer|Blob|String} data 数据
 * @return {Promise<string>} 哈希值
 */
const getHash = async (data) => {
  if (!globalThis.crypto) {
    // Node.js 环境
    const crypto = await import("crypto");
    if (typeof data === "string") {
      data = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      data = await data.arrayBuffer();
    }
    const hash = crypto.createHash("sha256");
    hash.update(Buffer.from(data));
    return hash.digest("hex");
  } else {
    // 浏览器环境
    if (typeof data === "string") {
      data = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      data = await data.arrayBuffer();
    }
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray
      .map((bytes) => bytes.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }
};

/**
 * 将数据和对象信息组装成一个buffer对象
 * 格式：[prefixLength][prefixBuffer][originBuffer]
 * @param {Uint8Array} originBuffer - 原始二进制数据
 * @param {Object} info - 要附加的对象信息
 * @returns {Uint8Array} 组装后的buffer对象
 * @throws {Error} 当参数类型不正确时抛出错误
 */
const toBuffer = (originBuffer, info) => {
  // 参数类型检查
  if (!(originBuffer instanceof Uint8Array)) {
    throw new Error("originBuffer must be a Uint8Array");
  }

  // 将对象信息转换为JSON字符串并编码为Uint8Array
  const infoJson = JSON.stringify(info);
  const infoBuffer = new TextEncoder().encode(infoJson);

  // 检查长度是否超出限制（255字节）
  if (infoBuffer.length > 255) {
    throw new Error("Info data is too large, must be less than 255 bytes");
  }

  // 第一个字节存储infoBuffer的长度
  const prefixLength = infoBuffer.length;

  // 创建组合buffer：prefixLength + infoBuffer + originBuffer
  const combinedBuffer = new Uint8Array(1 + prefixLength + originBuffer.length);

  // 设置各部分数据
  combinedBuffer[0] = prefixLength;
  combinedBuffer.set(infoBuffer, 1);
  combinedBuffer.set(originBuffer, 1 + prefixLength);

  return combinedBuffer;
};

/**
 * 从buffer对象中解析出原始数据和附加信息
 * @param {Uint8Array} buffer - 包含数据和信息的buffer对象
 * @returns {Object} 包含data和info属性的对象
 * @throws {Error} 当buffer格式不正确或数据损坏时抛出错误
 */
const toData = (buffer) => {
  // 参数检查
  if (!(buffer instanceof Uint8Array)) {
    throw new Error("buffer must be a Uint8Array");
  }

  if (buffer.length < 1) {
    throw new Error("buffer is too short");
  }

  // 读取infoBuffer的长度
  const prefixLength = buffer[0];

  // 边界检查
  if (1 + prefixLength > buffer.length) {
    throw new Error("buffer is corrupted or format is incorrect");
  }

  // 提取infoBuffer和originBuffer
  const infoBuffer = buffer.slice(1, 1 + prefixLength);
  const originBuffer = buffer.slice(1 + prefixLength);

  // 解码infoBuffer为对象
  try {
    const infoJson = new TextDecoder().decode(infoBuffer);
    const info = JSON.parse(infoJson);

    return {
      data: originBuffer,
      info: info,
    };
  } catch (error) {
    throw new Error("Failed to parse info data: " + error.message);
  }
};

const options = {
  // 认证用户信息
  async authentication({ client, clients, users, message }) {
    try {
      const data = message.signedData;

      if (data.cid !== client.cid) {
        throw new Error("cid 不匹配");
      }

      // 验证签名并获取数据
      const result = await verify(data);
      if (!result) {
        throw new Error("签名被篡改");
      }

      // 匹配成功后，填入信息
      client.userInfo = data.info;
      client.userId = await getHash(data.publicKey);
      client.publicKey = data.publicKey;
      client.state = "authed";
      client.userSessionId = data.userSessionId;

      // 清除认证定时器
      clearTimeout(client._authTimer);

      // 添加到用户映射对象
      let userPool = users.get(client.userId);
      if (!userPool) {
        userPool = new Set();
        users.set(client.userId, userPool);
      }

      userPool.add(client);

      // 认证成功后，发送确认消息
      client.send({
        type: "auth_success",
        userInfo: client.userInfo,
        userId: client.userId,
        message: "认证成功",
      });

      client.sendServerInfo();
    } catch (err) {
      console.error(err);
      // 发送认证失败消息
      client.send({
        type: "error",
        kind: "authentication",
        message: err.message,
      });

      setTimeout(() => {
        client.close();
      }, 100);
      return;
    }
  },
  // 检查用户是否在线
  async find_user({ client, clients, users, message }) {
    const { userId } = message;
    let userPool = users.get(userId);
    userPool = userPool ? Array.from(userPool) : [];

    client.send({
      type: "response_find_user",
      userId,
      publicKey: userPool.length > 0 ? userPool[0].publicKey : null, // 目标用户的publicKey
      tabs: userPool,
      isOnline: userPool && userPool.length > 0,
    });
  },

  // 转发用户数据
  async agent_data({ client, clients, users, message, binaryData }) {
    const { options, data } = message;
    const { userId, userSessionId, ...otherData } = options;

    if (userId) {
      const targetUserClients = users.get(userId);
      if (!targetUserClients) return;

      const sendData = binaryData
        ? toBuffer(binaryData, {
            ...otherData,
            type: "agent_data",
            fromUserId: client.userId,
            fromUserSessionId: client.userSessionId,
          })
        : {
            ...otherData,
            type: "agent_data",
            data,
            fromUserId: client.userId,
            fromUserSessionId: client.userSessionId,
          };

      let targetDeviceClient = null;

      if (userSessionId) {
        targetDeviceClient = Array.from(targetUserClients).find(
          (client) => client.userSessionId === userSessionId
        );
      }

      if (!targetDeviceClient) {
        targetDeviceClient = targetUserClients.values().next().value;
      }

      // 发送给目标客户
      if (targetDeviceClient) {
        targetDeviceClient.send(sendData);
      }
    }
  },
  // 更新延迟时间
  async update_delay({ client, clients, users, message }) {
    const { delay } = message;
    client.delay = delay;
  },
};

const require = createRequire(import.meta.url);

const packageJson = require("../package.json");

const initServer = async ({
  password,
  port = 8081,
  serverName = "handserver",
}) => {
  let server;
  const clients = new Map(); // 用户cid索引数据
  const users = new Map(); // 用户userId索引数据

  // 定义连接处理函数
  function onConnect(ws) {
    const client = new DeviceClient(ws, server); // 传递 clients Map 给 DeviceClient
    ws._client = client;
    clients.set(client.cid, client);
    console.log("新客户端已连接: ", client.cid);

    client._authTimer = setTimeout(() => {
      client.close();
    }, 1000 * 3); // 3秒未认证则关闭连接

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
    if (ws._client.userId) {
      const userPool = users.get(ws._client.userId);
      if (userPool) {
        userPool.delete(ws._client);
      }
    }
  }

  // 定义错误处理函数
  function onError(ws, error) {
    // TODO: 应该记录下错误信息
    if (ws._client) {
      clients.delete(ws._client.cid);
      if (ws._client.userId) {
        const userPool = users.get(ws._client.userId);
        if (userPool) {
          userPool.delete(ws._client);
        }
      }
    }
  }

  // 定义消息处理函数
  function onMessage(ws, message) {
    const client = ws._client;

    // 二进制数据
    let binaryData = null;

    if (message instanceof Buffer) {
      const { data, info } = toData(message);
      binaryData = data;
      message = info;
    }

    if (options[message.type]) {
      options[message.type]({
        client,
        clients,
        users,
        message,
        binaryData,
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
        options$1[message.type]({ client, clients, message });
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
  server.serverName = serverName;
  server.serverVersion = packageJson.version;

  // 启动服务器，监听指定端口
  server.start(port);

  return server;
};

export { initServer };
//# sourceMappingURL=index.js.map
