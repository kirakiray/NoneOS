import { HandServerClient } from "./client.js";

export class AdminHandServerClient extends HandServerClient {
  constructor({ url, user, password }) {
    super({ url, user });
    this.password = password;
  }

  // 获取在线列表用户数据（支持分页）
  async getClients(options = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // 等待服务器响应
      this.socket.send(
        JSON.stringify({
          type: "get_connections",
          password: this.password,
          ...options, // 可包含 page 和 pageSize 参数
        })
      );

      return new Promise((resolve, reject) => {
        const listener = (event) => {
          const { type, clients, pagination } = event.detail;
          if (type === "connections_info") {
            this.removeEventListener("message", listener);
            resolve({ clients, pagination });
          }
        };
        this.addEventListener("message", listener);
      });
    } else {
      throw new Error("WebSocket连接未建立，无法发送刷新请求");
    }
  }

  // 获取所有在线列表用户数据（自动处理分页）
  async getAllClients() {
    const allClients = [];
    let page = 1;
    const pageSize = 50; // 每页获取50条记录

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { clients, pagination } = await this.getClients({ page, pageSize });
      allClients.push(...clients);

      // 如果当前页是最后一页，则退出循环
      if (page >= pagination.totalPages) {
        break;
      }

      page++;
    }

    return allClients;
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
