export class DeviceClient {
  #users;
  constructor(ws, server, users) {
    if (ws._client) {
      throw new Error("客户端已经初始化过:" + ws._client.cid);
    }

    this.state = "unauth"; // 未认证：unauth；认证完成：authed
    this.userId = null; // 认证完成后设置用户ID
    this.publicKey = null; // 认证完成后设置用户公钥
    this.userSessionId = null; // 认证完成后设置用户会话ID
    this.delay = 0; // 延迟时间
    this.#users = users;

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

  get userData() {
    if (!this.userId) {
      throw new Error("用户ID为空");
    }

    let userData = this.#users.get(this.userId);

    if (!userData) {
      userData = {
        userId: this.userId,
        userPool: new Set(),
        followUsers: [], // 关注的用户ID列表
        userInfo: null, // 认证完成后设置用户信息
      };

      this.#users.set(this.userId, userData);
    }

    return userData;
  }

  get userInfo() {
    return this.userData.userInfo;
  }

  set userInfo(info) {
    this.userData.userInfo = info;
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
