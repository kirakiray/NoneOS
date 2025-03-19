import { signData } from "./main.js";

const Stanz = $.Stanz;

// WebSocket客户端类：负责与服务器建立连接并处理通信
export class HandClient extends Stanz {
  #webSocket; // WebSocket实例
  #serverUrl; // WebSocket服务器地址
  #userStore; // 用户数据存储
  #serverIdentifier; // 服务器提供的身份标识

  constructor({ store, url }) {
    super({
      connectionState: "disconnected", // 连接状态：disconnected(未连接) | connecting(连接中) | verifying(验证中) | connected(已连接) | error(错误)
    });

    this.#serverUrl = url;
    this.#userStore = store;

    return this;
  }

  // 建立WebSocket连接
  connect() {
    // 防止重复连接
    if (
      this.connectionState === "connecting" ||
      this.connectionState === "connected"
    ) {
      return;
    }

    return new Promise((resolve, reject) => {
      const webSocket = (this.#webSocket = new WebSocket(this.#serverUrl));
      this.connectionState = "connecting";

      // 连接成功回调
      webSocket.onopen = () => {
        console.log("WebSocket连接已建立");
        this.connectionState = "verifying";
        resolve(true);
      };

      // 接收消息处理
      webSocket.onmessage = async (event) => {
        let messageData = event.data;
        console.log("收到服务器消息:", messageData);

        try {
          messageData = JSON.parse(event.data);
        } catch (error) {
          console.error("消息解析失败:", error);
          return;
        }

        switch (messageData.type) {
          case "init":
            // 保存服务器标识，用于后续身份验证
            this.#serverIdentifier = messageData.mark;

            // 生成签名认证数据
            const authenticationData = await this.generateAuthData({
              userName: this.#userStore.userName,
              markid: messageData.mark,
            });

            // 发送认证请求
            this.sendMessage({
              type: "auth",
              authedData: authenticationData,
            });
            break;

          case "authed":
            this.connectionState = "connected";
            console.log("用户认证成功");
            break;
        }
      };

      // 连接关闭处理
      webSocket.onclose = () => {
        this.connectionState = "disconnected";
        reject("连接已关闭");
      };

      // 错误处理
      webSocket.onerror = (error) => {
        console.error("WebSocket连接错误:", error);
        this.connectionState = "error";
        reject(error);
      };
    });
  }

  // 生成用户认证数据
  async generateAuthData(data = {}) {
    return await signData(data, this.#userStore);
  }

  // 发送消息到服务器
  sendMessage(data) {
    this.#webSocket.send(JSON.stringify(data));
  }
}
