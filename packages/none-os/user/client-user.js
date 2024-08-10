import { User } from "./public-user.js";

export class ClientUser extends User {
  constructor(...args) {
    super(...args);
  }

  // 发送数据给服务端
  async post(data) {
    debugger;
  }

  // 连接用户
  async connect() {
    debugger;
  }

  // 初始化通道
  async init(server) {
    this._server = server;
  }

  async close() {
    debugger;
    this._server = null;
  }
}
