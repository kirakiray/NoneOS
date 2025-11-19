export class Client {
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

  _generateCid() {
    let cid = Math.random().toString(36).slice(2, 8);
    while (this.server.clients && this.server.clients.has(cid)) {
      cid = Math.random().toString(36).slice(2, 8);
    }
    return cid;
  }

  _setupAuthTimeout() {
    this._authTimer = setTimeout(() => {
      if (this.state === "unauth") {
        this.close();
      }
    }, 5000); // 5秒未认证则关闭连接
  }

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

  _isBinaryData(data) {
    return (
      data instanceof ArrayBuffer ||
      data instanceof Uint8Array ||
      data instanceof Buffer ||
      typeof data === "string"
    );
  }

  close() {
    if (this._authTimer) {
      clearTimeout(this._authTimer);
      this._authTimer = null;
    }
    this.ws.close();
  }

  // 认证成功后的处理
  onAuthenticated(userId) {
    this.state = "authed";
    if (this._authTimer) {
      clearTimeout(this._authTimer);
      this._authTimer = null;
    }
  }

  // 发送服务器信息
  sendServerInfo() {
    this.send({
      type: "server_info",
      serverName: this.server.serverName,
      serverVersion: this.server.serverVersion,
      cid: this.cid,
    });
  }

  // 发送认证成功消息
  sendAuthSuccess() {
    this.send({
      type: "auth_success",
      userInfo: this.userInfo,
      userId: this.userId,
      message: "认证成功",
    });
  }

  // 发送需要认证消息
  sendNeedAuth() {
    this.send({
      type: "need_auth",
      cid: this.cid,
      time: new Date().toISOString(),
    });
  }

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
