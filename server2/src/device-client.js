export class DeviceClient {
  constructor(ws, server) {
    if (ws._client) {
      throw new Error("客户端已经初始化过:" + ws._client.cid);
    }

    this.state = "unauth"; // 未认证：unauth；认证完成：authed
    this.userId = null; // 认证完成后设置用户ID
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
