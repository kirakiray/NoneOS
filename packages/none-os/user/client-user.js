import { User } from "./public-user.js";

export class ClientUser extends User {
  #status = "disconnected";
  constructor(...args) {
    super(...args);
  }

  // 发送数据给服务端
  async post(data) {
    if (this.#status === "disconnected") {
      console.warn("target user disconnected");
      return;
    }

    debugger;
  }

  // 开始初始化信息
  async _initConnect(data) {
    console.log("开始初始化: ", data, this);

    // setTimeout(() => {
    //   this.connect({
    //     v: "我收到了",
    //   });
    // }, 1000);
  }

  // 连接用户
  connect(data) {
    fetch(this.postUrl, {
      method: "POST",
      body: JSON.stringify({
        agent: {
          targetId: this.id,
          data: data || {
            val: "你好吗",
          },
        },
      }),
    });
  }

  // 初始化通道
  async init(server) {
    this._server = server;
  }

  async close() {
    debugger;
    this._server = null;
  }

  get postUrl() {
    return new URL(this._server.serverUrl).origin + this._server.apiID;
  }
}
