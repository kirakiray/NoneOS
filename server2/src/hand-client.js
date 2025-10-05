export class HandClient {
  constructor(ws, server) {
    if (ws._client) {
      throw new Error("客户端已经初始化过:" + ws._client.cid);
    }

    this.state = "unauth"; // 未认证：unauth；认证完成：authed
    this.userId = null; // 认证完成后设置用户ID
    this.userInfo = null; // 认证完成后设置用户信息

    this.cid = Math.random().toString(36).slice(2, 8);
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
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.ws.close();
  }
}
