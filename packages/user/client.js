const Stanz = $.Stanz;

// 和服务器交互的类
export class HandClient extends Stanz {
  #ws; // websocket
  #url; // websocket的url
  #selfUserStore; // 自己的数据

  constructor({ store, url }) {
    super({
      state: "disconnected", // 未连接
      url,
    });

    this.#selfUserStore = store;

    return this;
  }

  // 初始化websocket
  connect() {
    if (this.state === "connecting" || this.state === "connected") {
      return;
    }

    return new Promise((resolve, reject) => {
      const ws = (this.#ws = new WebSocket(this.url || "ws://localhost:5579"));

      this.state = "connecting";

      ws.onopen = () => {
        console.log("连接成功", this);
        this.state = "connected";
        resolve(true);

        // 更新用户信息
        this.updateUserInfo();
      };

      ws.onmessage = (event) => {
        console.log("服务器", event.data);
      };

      ws.onclose = () => {
        this.state = "disconnected";
        reject("close");
      };

      ws.onerror = (error) => {
        console.error("WebSocket 错误:", error);
        console.log("错误", "连接发生错误");
        this.state = "error";
        reject(error);
      };
    });
  }

  // 更新用户信息到握手服务器
  async updateUserInfo(user) {}
}
