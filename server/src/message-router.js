import { pack, unpack } from "../../packages/user/util/pack.js";

export class MessageRouter {
  constructor(clientManager, adminPassword) {
    this.clientManager = clientManager;
    this.adminPassword = adminPassword;
    this.handlers = new Map();
    this._setupDefaultHandlers();
  }

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

  register(messageType, handler, requireAdmin = false) {
    this.handlers.set(messageType, { handler, requireAdmin });
  }

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
        response: message 
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
        clientManager: this.clientManager
      });
    } catch (error) {
      console.error(`处理消息 ${message.type} 时出错:`, error);
      client.send({ 
        type: "error", 
        message: "消息处理失败", 
        error: error.message 
      });
    }
  }

  // 基础消息处理器
  handlePing({ client }) {
    client.send({
      type: "pong",
      timestamp: new Date().toISOString()
    });
  }

  handleEcho({ client, message }) {
    client.send({
      type: "echo",
      message: message.message,
      timestamp: new Date().toISOString()
    });
  }

  async handleAuthentication({ client, message }) {
    try {
      const userId = await this.clientManager.authenticateClient(client, message.signedData);
      client.onAuthenticated(userId);
      client.sendAuthSuccess();
      client.sendServerInfo();
    } catch (error) {
      client.send({
        type: "error",
        kind: "authentication",
        message: error.message
      });
      
      setTimeout(() => {
        client.close();
      }, 100);
    }
  }

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
      isOnline: userPool && userPool.length > 0
    });
  }

  async handleAgentData({ client, message, binaryData }) {
    const { options, data } = message;
    const { userId, userSessionId } = options;

    if (!userId) return;

    const targetUserData = this.clientManager.getUserById(userId);
    if (!targetUserData || !targetUserData.userPool) return;

    let sendData;
    try {
      sendData = pack({
        type: "agent_data",
        fromUserId: client.userId,
        fromUserSessionId: client.userSessionId
      }, binaryData);
    } catch (err) {
      console.error("打包数据失败:", err);
      return;
    }

    let targetDeviceClient = null;

    if (userSessionId) {
      targetDeviceClient = Array.from(targetUserData.userPool).find(
        c => c.userSessionId === userSessionId
      );
    }

    if (!targetDeviceClient) {
      targetDeviceClient = targetUserData.userPool.values().next().value;
    }

    if (targetDeviceClient) {
      targetDeviceClient.send(sendData);
    }
  }

  handleUpdateDelay({ client, message }) {
    const { delay } = message;
    client.delay = delay;
  }

  handleFollowList({ client, message }) {
    const newFollowUsers = message.follows.split(",");
    this.clientManager.updateFollowList(client, newFollowUsers);
  }

  // 管理员消息处理器
  handleGetConnections({ client }) {
    const connectionsInfo = this.clientManager.getAllClients().map(client2 => ({
      id: client2.cid,
      userId: client2.userId,
      userInfo: client2.userInfo,
      connectTime: client2.connectTime,
      state: client2.state,
      username: client2.userInfo?.name,
      delay: client2.delay
    }));

    client.send({
      type: "connections_info",
      clients: connectionsInfo
    });
  }

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
        message: `已断开客户端 ${clientId} 的连接`
      });
    } else {
      client.send({
        type: "error",
        message: `未找到客户端 ${clientId}`
      });
    }
  }
}