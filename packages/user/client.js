import { signData } from "./main.js";

const Stanz = $.Stanz;

// 和服务器交互的类
export class HandClient extends Stanz {
  #ws; // websocket
  #url; // websocket的url
  #selfUserStore; // 自己的数据
  #serverMark; // 服务器标识

  constructor({ store, url }) {
    super({
      state: "disconnected", // 未连接
    });

    this.#url = url;

    this.#selfUserStore = store;

    return this;
  }

  // 初始化websocket
  connect() {
    if (this.state === "connecting" || this.state === "connected") {
      return;
    }

    return new Promise((resolve, reject) => {
      const ws = (this.#ws = new WebSocket(this.#url));

      this.state = "connecting";

      ws.onopen = () => {
        console.log("连接成功", this);
        this.state = "verifying";
        resolve(true);
      };

      ws.onmessage = async (event) => {
        let data = event.data;

        console.log("服务器", data);

        try {
          data = JSON.parse(event.data);
        } catch (error) {
          console.error("无法解析 JSON 数据:", error);
          return;
        }

        switch (data.type) {
          case "init":
            this.#serverMark = data.mark;

            // 发送签名的用户卡片进行认证
            const afterData = await this.getAuthData({
              userName: this.#selfUserStore.userName,
              markid: data.mark,
            });

            this.send({
              type: "auth",
              authedData: afterData,
            });
            break;
          case "authed":
            this.state = "connected";

            console.log("账户初始化成功", this);
            break;
        }
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

  // 生成自身的用户卡片
  async getAuthData(data = {}) {
    // 生成用户卡片
    const signedData = await signData(
      {
        ...data,
      },
      this.#selfUserStore
    );

    return signedData;
  }

  send(data) {
    this.#ws.send(JSON.stringify(data));
  }
}
