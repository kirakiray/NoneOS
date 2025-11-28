#!/usr/bin/env node
import { createRequire } from 'node:module';

/**
 * WebSocket服务器类
 * 提供跨平台的WebSocket服务器实现，支持Bun和Node.js环境
 */
class WebSocketServer {
  /**
   * 构造函数，初始化WebSocket服务器
   * @param {Object} options - 配置选项
   * @param {Function} options.onMessage - 消息处理函数
   * @param {Function} options.onConnect - 连接处理函数
   * @param {Function} options.onClose - 关闭处理函数
   * @param {Function} options.onError - 错误处理函数
   */
  constructor(options = {}) {
    this.wss = null;
    this.server = null;

    const { onMessage, onConnect, onClose, onError } = options;

    if (typeof onMessage !== "function") {
      throw new Error("onMessage 必须是一个函数");
    }

    this.onMessage = onMessage;
    this.onConnect = onConnect;
    this.onClose = onClose;
    this.onError = onError;
  }

  /**
   * 启动WebSocket服务器
   * @param {number} port - 监听端口
   */
  start(port = 8080) {
    if (typeof Bun !== "undefined") {
      this._startBunServer(port);
    } else {
      this._startNodeServer(port);
    }
  }

  /**
   * 启动Bun WebSocket服务器
   * @param {number} port - 监听端口
   */
  _startBunServer(port) {
    console.log("使用Bun原生WebSocket服务器");

    const websocketHandler = {
      open: (ws) => {
        if (this.onConnect) {
          this.onConnect(ws);
        }
      },

      message: (ws, data) => {
        try {
          if (this._isBinaryData(data)) {
            this.onMessage(ws, data);
            return;
          }

          const message = JSON.parse(data);
          this.onMessage(ws, message);
        } catch (error) {
          console.error("处理消息时出错:", error);
          ws.send(JSON.stringify({ type: "error", message: "消息格式错误" }));
        }
      },

      close: (ws, code, message) => {
        if (this.onClose) {
          this.onClose(ws, code, message);
        }
      },

      error: (ws, error) => {
        if (this.onError) {
          this.onError(ws, error);
        }
      },
    };

    this.server = Bun.serve({
      port: port,
      fetch: (req, server) => {
        if (server.upgrade(req)) {
          return;
        }
        return new Response("无法找到该页面", { status: 404 });
      },
      websocket: websocketHandler,
    });

    console.log(`Bun WebSocket服务器启动，监听端口 ${port}`);
  }

  /**
   * 启动Node.js WebSocket服务器
   * @param {number} port - 监听端口
   */
  async _startNodeServer(port) {
    console.log("使用Node.js ws库");

    try {
      const { WebSocketServer } = await import('ws');

      this.wss = new WebSocketServer({ port: port });
      console.log(`WebSocket服务器启动，监听端口 ${port}`);

      this.wss.on("connection", (ws, req) => {
        if (this.onConnect) {
          this.onConnect(ws);
        }

        ws.on("message", (data, isBinary) => {
          try {
            if (isBinary) {
              this.onMessage(ws, data);
              return;
            }

            const message = JSON.parse(data.toString());
            this.onMessage(ws, message);
          } catch (error) {
            console.error("处理消息时出错:", error);
            ws.send(JSON.stringify({ type: "error", message: "消息格式错误" }));
          }
        });

        ws.on("close", (code, reason) => {
          if (this.onClose) {
            this.onClose(ws, code, reason);
          }
        });

        ws.on("error", (err) => {
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
   * 判断是否为二进制数据
   * @param {*} data - 待判断的数据
   * @returns {boolean} 是否为二进制数据
   */
  _isBinaryData(data) {
    return (
      data instanceof ArrayBuffer ||
      data instanceof Uint8Array ||
      data instanceof Buffer ||
      (typeof data !== "string" && !(data instanceof String))
    );
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

const getHash = async (data) => {
  if (!globalThis.crypto) {
    // Node.js 环境
    const crypto = await import('crypto');
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
 * 客户端管理器类
 * 负责管理所有连接到服务器的客户端，包括认证、用户状态跟踪等功能
 */

class ClientManager {
  constructor() {
    this.clients = new Map(); // cid -> client，存储所有客户端连接
    this.users = new Map(); // userId -> userData，存储认证后的用户数据
    this.followIndex = new Map(); // followedUserId -> followerUserId[]，存储用户关注关系
  }

  /**
   * 添加客户端到管理器
   * @param {Client} client - 客户端实例
   */
  addClient(client) {
    this.clients.set(client.cid, client);
  }

  /**
   * 从管理器中移除客户端
   * @param {string} cid - 客户端ID
   */
  removeClient(cid) {
    const client = this.clients.get(cid);
    if (!client) return;

    this.clients.delete(cid);

    if (client.userId) {
      this._removeUserClient(client);
    }
  }

  /**
   * 从用户池中移除客户端
   * @param {Client} client - 客户端实例
   */
  _removeUserClient(client) {
    const userData = this.users.get(client.userId);
    if (!userData) return;

    userData.userPool.delete(client);

    if (userData.userPool.size === 0) {
      this._cleanupUser(client.userId);
    }
  }

  /**
   * 清理用户数据
   * @param {string} userId - 用户ID
   */
  _cleanupUser(userId) {
    const userData = this.users.get(userId);
    if (!userData) return;

    // 清理关注关系
    const followUsers = userData.followUsers || [];
    for (const followedUserId of followUsers) {
      const followers = this.followIndex.get(followedUserId);
      if (followers) {
        const index = followers.indexOf(userId);
        if (index > -1) {
          followers.splice(index, 1);
          if (followers.length === 0) {
            this.followIndex.delete(followedUserId);
          }
        }
      }
    }

    // 通知关注者用户下线
    const followers = this.followIndex.get(userId);
    if (followers) {
      for (const followerId of followers) {
        const followerUser = this.users.get(followerId);
        if (followerUser && followerUser.userPool) {
          followerUser.userPool.forEach((userClient) => {
            userClient.send({
              type: "notify_follow",
              online: [],
              offline: [userId],
              message: "你关注的用户下线了",
            });
          });
        }
      }
    }

    this.users.delete(userId);
  }

  /**
   * 验证客户端身份
   * @param {Client} client - 客户端实例
   * @param {Object} signedData - 签名数据
   * @returns {Promise<string>} 用户ID
   */
  async authenticateClient(client, signedData) {
    if (signedData.cid !== client.cid) {
      throw new Error("cid 不匹配");
    }

    const result = await verify(signedData);

    if (!result) {
      throw new Error("签名被篡改");
    }

    const userId = await getHash(signedData.publicKey);

    client.userId = userId;
    client.publicKey = signedData.publicKey;
    client.state = "authed";
    client.userSessionId = signedData.userSessionId;
    client.userInfo = signedData.info;

    const userData = this._getOrCreateUserData(userId);
    userData.userPool.add(client);
    userData.userInfo = signedData.info;

    // 通知关注者用户上线
    const followers = this.followIndex.get(userId);
    if (followers) {
      for (const followerId of followers) {
        const followerUser = this.users.get(followerId);
        if (followerUser && followerUser.userPool) {
          followerUser.userPool.forEach((userClient) => {
            userClient.send({
              type: "notify_follow",
              online: [userId],
              offline: [],
              message: "你关注的用户上线了",
            });
          });
        }
      }
    }

    return userId;
  }

  /**
   * 获取或创建用户数据
   * @param {string} userId - 用户ID
   * @returns {Object} 用户数据对象
   */
  _getOrCreateUserData(userId) {
    let userData = this.users.get(userId);
    if (!userData) {
      userData = {
        userId,
        userPool: new Set(),
        followUsers: [],
        userInfo: null,
      };
      this.users.set(userId, userData);
    }
    return userData;
  }

  /**
   * 更新用户关注列表
   * @param {Client} client - 客户端实例
   * @param {Array} followUsers - 关注的用户ID列表
   */
  updateFollowList(client, followUsers) {
    if (followUsers.length > 32) {
      followUsers = followUsers.slice(0, 32);
    }

    const userData = this.users.get(client.userId);
    if (!userData) return;

    const oldFollowUsers = userData.followUsers || [];

    // 清理旧的反向索引
    for (const followedUserId of oldFollowUsers) {
      const followers = this.followIndex.get(followedUserId);
      if (followers) {
        const index = followers.indexOf(client.userId);
        if (index > -1) {
          followers.splice(index, 1);
          if (followers.length === 0) {
            this.followIndex.delete(followedUserId);
          }
        }
      }
    }

    // 建立新的反向索引
    for (const followedUserId of followUsers) {
      if (!this.followIndex.has(followedUserId)) {
        this.followIndex.set(followedUserId, []);
      }
      const followers = this.followIndex.get(followedUserId);
      if (!followers.includes(client.userId)) {
        followers.push(client.userId);
      }
    }

    userData.followUsers = followUsers;
  }

  /**
   * 根据用户ID获取用户数据
   * @param {string} userId - 用户ID
   * @returns {Object|undefined} 用户数据对象或undefined
   */
  getUserById(userId) {
    return this.users.get(userId);
  }

  /**
   * 根据客户端ID获取客户端实例
   * @param {string} cid - 客户端ID
   * @returns {Client|undefined} 客户端实例或undefined
   */
  getClientById(cid) {
    return this.clients.get(cid);
  }

  /**
   * 获取所有客户端实例数组
   * @returns {Array} 所有客户端实例数组
   */
  getAllClients() {
    return Array.from(this.clients.values());
  }

  /**
   * 获取所有用户数据数组
   * @returns {Array} 所有用户数据数组
   */
  getAllUsers() {
    return Array.from(this.users.values());
  }
}

/**
 * 将任意可 JSON 序列化的对象 + 一个 Uint8Array 打包成一个新的 Uint8Array
 * @param {any} obj        可 JSON 序列化的对象
 * @param {Uint8Array} data 二进制数据
 * @returns {Uint8Array}   合并后的结果
 */
function pack(obj, data) {
  const meta = new TextEncoder().encode(JSON.stringify(obj));
  const header = new Uint8Array(4);
  new DataView(header.buffer).setUint32(0, meta.length, true); // 小端 4 字节长度

  const result = new Uint8Array(4 + meta.length + data.length);
  result.set(header, 0);
  result.set(meta, 4);
  result.set(data, 4 + meta.length);
  return result;
}

/**
 * 将 pack 生成的 Uint8Array 还原成 { obj, data }
 * @param {Uint8Array} buffer 由 pack 产生的数据
 * @returns {{obj: any, data: Uint8Array}}
 */
function unpack(buffer) {
  if (buffer.length < 4) throw new Error("Invalid buffer");
  const metaLen = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(
    0,
    true
  );
  if (4 + metaLen > buffer.length) throw new Error("Invalid meta length");

  const metaBytes = buffer.slice(4, 4 + metaLen);
  const data = buffer.slice(4 + metaLen);

  const obj = JSON.parse(new TextDecoder().decode(metaBytes));
  return { obj, data };
}

// /* ========== 使用示例 ========== */
// const originalObj = { name: "Alice", age: 23 };
// const originalData = new Uint8Array([0xff, 0x00, 0xab, 0xcd]);

// const packed = pack(originalObj, originalData);
// console.log("packed:", packed);

// const { obj, data } = unpack(packed);
// console.log("unpacked obj:", obj);
// console.log("unpacked data:", data);

/**
 * 消息路由器类
 * 负责处理来自客户端的消息，根据消息类型分发到相应的处理器
 */

class MessageRouter {
  /**
   * 构造函数，初始化消息路由器
   * @param {ClientManager} clientManager - 客户端管理器实例
   * @param {string} adminPassword - 管理员密码
   */
  constructor(clientManager, adminPassword) {
    this.clientManager = clientManager;
    this.adminPassword = adminPassword;
    this.handlers = new Map();
    this._setupDefaultHandlers();
  }

  /**
   * 设置默认消息处理器
   */
  _setupDefaultHandlers() {
    // 基础消息处理
    this.register("ping", this.handlePing);
    this.register("echo", this.handleEcho);
    this.register("authentication", this.handleAuthentication);
    this.register("find_user", this.handleFindUser);
    this.register("agent_data", this.handleAgentData);
    this.register("update_delay", this.handleUpdateDelay);
    this.register("follow_list", this.handleFollowList);

    // 管理员消息处理
    this.register("get_connections", this.handleGetConnections, true);
    this.register("disconnect_client", this.handleDisconnectClient, true);
  }

  /**
   * 注册消息处理器
   * @param {string} messageType - 消息类型
   * @param {Function} handler - 处理器函数
   * @param {boolean} requireAdmin - 是否需要管理员权限，默认false
   */
  register(messageType, handler, requireAdmin = false) {
    this.handlers.set(messageType, { handler, requireAdmin });
  }

  /**
   * 处理接收到的消息
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {Object|string|Buffer} message - 接收到的消息
   */
  async handleMessage(ws, message) {
    const client = ws._client;
    if (!client) {
      console.error("客户端未初始化");
      return;
    }

    let binaryData = null;

    // 处理二进制数据
    if (message instanceof Buffer) {
      try {
        const { obj, data } = unpack(message);
        binaryData = data;
        message = obj;
      } catch (error) {
        client.send({ type: "error", message: "二进制数据解析失败" });
        return;
      }
    }

    const handlerInfo = this.handlers.get(message.type);
    if (!handlerInfo) {
      client.send({
        type: "error",
        message: "未知的消息类型",
        response: message,
      });
      return;
    }

    // 检查管理员权限
    if (handlerInfo.requireAdmin) {
      if (message.password !== this.adminPassword) {
        client.send({ type: "error", message: "密码错误" });
        return;
      }
    }

    try {
      await handlerInfo.handler.call(this, {
        client,
        message,
        binaryData,
        clientManager: this.clientManager,
      });
    } catch (error) {
      console.error(`处理消息 ${message.type} 时出错:`, error);
      client.send({
        type: "error",
        message: "消息处理失败",
        error: error.message,
      });
    }
  }

  // 基础消息处理器
  /**
   * 处理ping消息
   * @param {Object} params - 参数对象
   * @param {Client} params.client - 客户端实例
   */
  handlePing({ client }) {
    client.send({
      type: "pong",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 处理echo消息
   * @param {Object} params - 参数对象
   * @param {Client} params.client - 客户端实例
   * @param {Object} params.message - 消息对象
   */
  handleEcho({ client, message }) {
    client.send({
      type: "echo",
      message: message.message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 处理认证消息
   * @param {Object} params - 参数对象
   * @param {Client} params.client - 客户端实例
   * @param {Object} params.message - 消息对象
   */
  async handleAuthentication({ client, message }) {
    try {
      const userId = await this.clientManager.authenticateClient(
        client,
        message.signedData
      );
      client.onAuthenticated(userId);
      client.sendAuthSuccess();
      client.sendServerInfo();
    } catch (error) {
      client.send({
        type: "error",
        kind: "authentication",
        message: error.message,
      });

      setTimeout(() => {
        client.close();
      }, 100);
    }
  }

  /**
   * 处理查找用户消息
   * @param {Object} params - 参数对象
   * @param {Client} params.client - 客户端实例
   * @param {Object} params.message - 消息对象
   */
  handleFindUser({ client, message }) {
    const { userId } = message;
    const targetUserData = this.clientManager.getUserById(userId);
    const userPool = targetUserData?.userPool
      ? Array.from(targetUserData.userPool)
      : [];

    client.send({
      type: "response_find_user",
      userId,
      publicKey: userPool.length > 0 ? userPool[0].publicKey : null,
      tabs: userPool,
      isOnline: userPool && userPool.length > 0,
    });
  }

  /**
   * 处理代理数据消息
   * @param {Object} params - 参数对象
   * @param {Client} params.client - 客户端实例
   * @param {Object} params.message - 消息对象
   * @param {Buffer} params.binaryData - 二进制数据
   */
  async handleAgentData({ client, message, binaryData }) {
    const { options, data } = message;
    const { userId, userSessionId } = options;

    if (!userId) return;

    const targetUserData = this.clientManager.getUserById(userId);
    if (!targetUserData || !targetUserData.userPool) return;

    let sendData;
    try {
      sendData = pack(
        {
          type: "agent_data",
          fromUserId: client.userId,
          fromUserSessionId: client.userSessionId,
        },
        binaryData
      );
    } catch (err) {
      console.error("打包数据失败:", err);
      return;
    }

    let targetDeviceClient = null;

    if (userSessionId) {
      targetDeviceClient = Array.from(targetUserData.userPool).find(
        (c) => c.userSessionId === userSessionId
      );
    }

    if (!targetDeviceClient) {
      targetDeviceClient = targetUserData.userPool.values().next().value;
    }

    if (targetDeviceClient) {
      targetDeviceClient.send(sendData);
    }
  }

  /**
   * 处理更新延迟消息
   * @param {Object} params - 参数对象
   * @param {Client} params.client - 客户端实例
   * @param {Object} params.message - 消息对象
   */
  handleUpdateDelay({ client, message }) {
    const { delay } = message;
    client.delay = delay;
  }

  /**
   * 处理关注列表消息
   * @param {Object} params - 参数对象
   * @param {Client} params.client - 客户端实例
   * @param {Object} params.message - 消息对象
   */
  handleFollowList({ client, message }) {
    const newFollowUsers = message.follows.split(",");
    this.clientManager.updateFollowList(client, newFollowUsers);
  }

  // 管理员消息处理器
  /**
   * 处理获取连接信息消息（管理员）
   * @param {Object} params - 参数对象
   * @param {Client} params.client - 客户端实例
   */
  handleGetConnections({ client }) {
    const connectionsInfo = this.clientManager
      .getAllClients()
      .map((client2) => ({
        id: client2.cid,
        userId: client2.userId,
        userInfo: client2.userInfo,
        connectTime: client2.connectTime,
        state: client2.state,
        username: client2.userInfo?.name,
        delay: client2.delay,
      }));

    client.send({
      type: "connections_info",
      clients: connectionsInfo,
    });
  }

  /**
   * 处理断开客户端连接消息（管理员）
   * @param {Object} params - 参数对象
   * @param {Client} params.client - 客户端实例
   * @param {Object} params.message - 消息对象
   */
  handleDisconnectClient({ client, message }) {
    const { clientId } = message;
    if (!clientId) {
      client.send({ type: "error", message: "缺少客户端ID参数" });
      return;
    }

    const targetClient = this.clientManager.getClientById(clientId);
    if (targetClient) {
      targetClient.close();
      client.send({
        type: "success",
        message: `已断开客户端 ${clientId} 的连接`,
      });
    } else {
      client.send({
        type: "error",
        message: `未找到客户端 ${clientId}`,
      });
    }
  }
}

/**
 * 客户端类
 * 表示一个连接到服务器的客户端连接，处理客户端的状态和通信
 */
class Client {
  /**
   * 构造函数，初始化客户端
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {WebSocketServer} server - WebSocket服务器实例
   * @param {ClientManager} clientManager - 客户端管理器实例
   */
  constructor(ws, server, clientManager) {
    if (ws._client) {
      throw new Error("客户端已经初始化过:" + ws._client.cid);
    }

    this.ws = ws;
    this.server = server;
    this.clientManager = clientManager;

    this.cid = this._generateCid();
    this.state = "unauth"; // 未认证：unauth；认证完成：authed
    this.userId = null;
    this.publicKey = null;
    this.userSessionId = null;
    this.delay = 0;
    this.connectTime = new Date();
    this.userInfo = null;

    this._authTimer = null;
    this._setupAuthTimeout();

    ws._client = this;
  }

  /**
   * 生成客户端唯一ID
   * @returns {string} 客户端ID
   */
  _generateCid() {
    let cid = Math.random().toString(36).slice(2, 8);
    while (this.server.clients && this.server.clients.has(cid)) {
      cid = Math.random().toString(36).slice(2, 8);
    }
    return cid;
  }

  /**
   * 设置认证超时
   */
  _setupAuthTimeout() {
    this._authTimer = setTimeout(() => {
      if (this.state === "unauth") {
        this.close();
      }
    }, 5000); // 5秒未认证则关闭连接
  }

  /**
   * 发送数据到客户端
   * @param {Object|Buffer} data - 要发送的数据
   */
  send(data) {
    try {
      if (this._isBinaryData(data)) {
        this.ws.send(data);
      } else {
        this.ws.send(JSON.stringify(data));
      }
    } catch (error) {
      console.error("发送数据失败:", error);
    }
  }

  /**
   * 判断是否为二进制数据
   * @param {*} data - 待判断的数据
   * @returns {boolean} 是否为二进制数据
   */
  _isBinaryData(data) {
    return (
      data instanceof ArrayBuffer ||
      data instanceof Uint8Array ||
      data instanceof Buffer ||
      typeof data === "string"
    );
  }

  /**
   * 关闭客户端连接
   */
  close() {
    if (this._authTimer) {
      clearTimeout(this._authTimer);
      this._authTimer = null;
    }
    this.ws.close();
  }

  /**
   * 客户端认证成功后的处理
   * @param {string} userId - 用户ID
   */
  onAuthenticated(userId) {
    this.state = "authed";
    if (this._authTimer) {
      clearTimeout(this._authTimer);
      this._authTimer = null;
    }
  }

  /**
   * 发送服务器信息到客户端
   */
  sendServerInfo() {
    this.send({
      type: "server_info",
      serverName: this.server.serverName,
      serverVersion: this.server.serverVersion,
      cid: this.cid,
    });
  }

  /**
   * 发送认证成功消息到客户端
   */
  sendAuthSuccess() {
    this.send({
      type: "auth_success",
      userInfo: this.userInfo,
      userId: this.userId,
      message: "认证成功",
    });
  }

  /**
   * 发送需要认证消息到客户端
   */
  sendNeedAuth() {
    this.send({
      type: "need_auth",
      cid: this.cid,
      time: new Date().toISOString(),
    });
  }

  /**
   * 将客户端信息转换为JSON对象
   * @returns {Object} 客户端信息对象
   */
  toJSON() {
    return {
      cid: this.cid,
      userId: this.userId,
      userInfo: this.userInfo,
      userSessionId: this.userSessionId,
      connectTime: this.connectTime.toISOString(),
      state: this.state,
      delay: this.delay,
    };
  }
}

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

/**
 * 初始化服务器
 * @param {Object} options - 服务器配置选项
 * @param {string} options.password - 管理员密码
 * @param {number} options.port - 服务器端口，默认8081
 * @param {string} options.serverName - 服务器名称，默认"handserver"
 * @returns {WebSocketServer} WebSocket服务器实例
 */
const initServer = async ({
  password,
  port = 8081,
  serverName = "handserver",
}) => {
  // 初始化管理器
  const clientManager = new ClientManager();
  const messageRouter = new MessageRouter(clientManager, password);

  // WebSocket事件处理函数
  /**
   * 处理新客户端连接
   * @param {WebSocket} ws - WebSocket连接实例
   */
  function onConnect(ws) {
    const client = new Client(ws, server, clientManager);

    clientManager.addClient(client);
    console.log("新客户端已连接:", client.cid);

    // 发送认证请求
    client.sendNeedAuth();
  }

  /**
   * 处理客户端断开连接
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {number} code - 断开代码
   * @param {string} reason - 断开原因
   */
  function onClose(ws, code, reason) {
    const client = ws._client;
    if (client) {
      console.log("客户端断开连接:", client.cid);
      clientManager.removeClient(client.cid);
    }
  }

  /**
   * 处理WebSocket错误
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {Error} error - 错误对象
   */
  function onError(ws, error) {
    console.error("WebSocket错误:", error);
    const client = ws._client;
    if (client) {
      onClose(ws);
    }
  }

  /**
   * 处理接收到的消息
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {Object|string} message - 接收到的消息
   */
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

// // 如果是直接运行此文件，则启动服务器
// if (import.meta.url === `file://${process.argv[1]}`) {
//   const password = process.env.SERVER_PASSWORD || "noneos-server-password";
//   const port = parseInt(process.env.PORT || "8081");
//   const serverName = process.env.SERVER_NAME || "handserver";

//   initServer({ password, port, serverName }).catch((error) => {
//     console.error("启动服务器失败:", error);
//     process.exit(1);
//   });
// }

export { initServer };
//# sourceMappingURL=index.js.map
