/**
 * 客户端类
 * 表示一个连接到服务器的客户端连接，处理客户端的状态和通信
 */
export class Client {
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
