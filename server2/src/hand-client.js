export class HandClient {
  constructor(ws, server) {
    if (ws._client) {
      throw new Error("客户端已经初始化过:" + ws._client.cid);
    }

    this.cid = Math.random().toString(36).slice(2, 10);
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
