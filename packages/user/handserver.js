import { signData } from "./main.js";

const Stanz = $.Stanz;

// WebSocket客户端类：负责与服务器建立连接并处理通信
export class HandServer extends Stanz {
  #webSocket; // WebSocket实例
  #serverUrl; // WebSocket服务器地址
  #usedUserStore; // 使用的用户数据仓库
  #serverIdentifier; // 服务器提供的身份标识

  constructor({ store, url }) {
    super({
      connectionState: "disconnected", // 连接状态：disconnected(未连接) | connecting(连接中) | verifying(验证中) | connected(已连接) | error(错误)
      delayTime: null, // 和服务器的延迟时间
      pinging: false, // 是否正在发送心跳
      serverName: "unknown", // 服务器名称
      serverVersion: null, // 服务器版本
      connectedTime: null, // 连接建立时间
    });

    this.#serverUrl = url;
    this.#usedUserStore = store;

    return this;
  }

  get serverUrl() {
    return this.#serverUrl;
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
              userName: this.#usedUserStore.userName,
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
            this.connectedTime = Date.now();
            this.initHeartbeat();
            console.log("用户认证成功");
            break;
          case "pong":
            // 处理服务器的心跳响应
            this.delayTime = Date.now() - this._pingTime;
            delete this._pingTime;
            this.pinging = false;
            break;
          case "error":
            console.error("服务器返回错误:", messageData.error);
            break;
          case "post-response":
            // 处理服务器的响应
            const { taskId, data, success } = messageData;

            if (this._tasks[taskId]) {
              if (success) {
                this._tasks[taskId].resolve(data);
                delete this._tasks[taskId];
              } else {
                this._tasks[taskId].reject(data);
                delete this._tasks[taskId];
              }
            }
            break;
          case "update-server-info":
            this.serverName = messageData.data.serverName;
            this.serverVersion = messageData.data.serverVersion;
            break;

          case "agent-data":
            // 处理别的用户通过服务器转发的数据
            const { fromUserId, data: agentData, agentTaskId } = messageData;

            try {
              // 再处理数据
              if (typeof this._onagentdata === "function") {
                await this._onagentdata(fromUserId, agentData);
              }

              // 先确认收到数据
              await this.post({
                type: "confirm-agent",
                agentTaskId,
              });

              console.log("已处理来自用户", fromUserId, "的数据");
            } catch (error) {
              console.error("处理agent数据失败:", error);
            }
            break;
          default:
            console.warn("未知消息类型:", messageData.type);
            break;
        }
      };

      // 连接关闭处理
      webSocket.onclose = () => {
        console.log("WebSocket连接已关闭", this);
        this.connectionState = "disconnected";
        this.clearup();
        reject("连接已关闭");
      };

      // 错误处理
      webSocket.onerror = (error) => {
        console.error("WebSocket连接错误:", error);
        this.connectionState = "error";
        this.clearup();
        reject(error);
      };
    });
  }

  clearup() {
    clearInterval(this._heartbeatTimer);
    this.delayTime = null;
    this.pinging = false;

    // 清除任务
    if (this._tasks) {
      Object.keys(this._tasks).forEach((taskId) => {
        this._tasks[taskId].reject("连接已关闭");
        delete this._tasks[taskId];
      });
    }
  }

  // 初始化心跳机制
  initHeartbeat() {
    clearInterval(this._heartbeatTimer);

    // 先执行一次获取延迟时间
    this.ping();

    // 启动心跳定时器
    this._heartbeatTimer = setInterval(() => this.ping(), 30000);
  }

  ping() {
    if (this._pingTime) {
      return;
    }

    this.pinging = true;

    this._pingTime = Date.now();
    this.sendMessage({
      type: "ping",
    });
  }

  // 生成用户认证数据
  async generateAuthData(data = {}) {
    return await signData(data, this.#usedUserStore);
  }

  // 发送消息到服务器
  sendMessage(data) {
    this.#webSocket.send(JSON.stringify(data));
  }

  async ready() {
    return await this.watchUntil(() => this.connectionState === "connected");
  }

  // 模拟发送请求
  async post(data) {
    if (!this._tasks) {
      this._tasks = {};
    }

    const taskId = Math.random().toString(36).slice(2);
    this._tasks[taskId] = {
      resolve: null,
      reject: null,
    };

    return new Promise((resolve, reject) => {
      this._tasks[taskId].resolve = resolve;
      this._tasks[taskId].reject = reject;

      this.sendMessage({
        type: "post",
        taskId,
        data,
      });
    });
  }
}
