import { HandServerClient } from "./hand.js";

export class AdminHandServerClient extends HandServerClient {
  constructor({ url, user, password }) {
    super({ url, user });
    this.password = password;
  }

  // 获取在线列表用户数据
  async refreshClientsList() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "get_connections",
          password: this.password,
        })
      );
    } else {
      throw new Error("WebSocket连接未建立，无法发送刷新请求");
    }
  }

  // 断开指定客户端连接
  async disconnectClient(clientId) {
    if (!clientId) {
      throw new Error("缺少客户端ID参数");
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "disconnect_client",
          clientId: clientId,
          password: this.password,
        })
      );
    } else {
      throw new Error("WebSocket连接未建立，无法发送断开请求");
    }
  }
}
