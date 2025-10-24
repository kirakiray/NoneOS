import { HandServerClient } from "./client.js";

export class AdminHandServerClient extends HandServerClient {
  constructor({ url, user, password }) {
    super({ url, user });
    this.password = password;
  }

  // 获取在线列表用户数据
  // async refreshClientsList() {
  async getClients() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // 等待服务器响应
      this.socket.send(
        JSON.stringify({
          type: "get_connections",
          password: this.password,
        })
      );

      return new Promise((resolve, reject) => {
        const listener = (event) => {
          const { type, clients } = event.detail;
          if (type === "connections_info") {
            this.removeEventListener("message", listener);
            resolve(clients);
          } else {
            this.removeEventListener("message", listener);
            reject(new Error("服务器返回错误类型"));
          }
        };
        this.addEventListener("message", listener);
      });
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
