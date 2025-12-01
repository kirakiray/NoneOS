/**
 * 消息路由器类
 * 负责处理来自客户端的消息，根据消息类型分发到相应的处理器
 */
import { pack, unpack } from "../../packages/user/util/pack.js";

export class MessageRouter {
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
   * @param {Object} params.message - 消息对象，可包含分页参数 {page, pageSize}
   */
  handleGetConnections({ client, message }) {
    // 获取分页参数，默认值为第1页，每页20条记录
    const { page = 1, pageSize = 20 } = message || {};
    
    // 参数校验
    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.max(1, Math.min(100, parseInt(pageSize) || 20)); // 限制最大每页100条
    
    // 获取所有客户端连接信息
    const allConnections = this.clientManager
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

    // 计算分页数据
    const total = allConnections.length;
    const totalPages = Math.ceil(total / size);
    const startIndex = (pageNum - 1) * size;
    const connectionsInfo = allConnections.slice(startIndex, startIndex + size);

    client.send({
      type: "connections_info",
      clients: connectionsInfo,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages,
      },
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
