import { HandServerClient } from "./hand.js";

export class AdminHandServerClient extends HandServerClient {
  constructor(ws, server, password) {
    super(ws, server);
    this.password = password;
  }

  // 获取在线列表用户数据
  async refreshClientsList() {}
  // 断开指定客户端连接
  async disconnectClient() {}
}
