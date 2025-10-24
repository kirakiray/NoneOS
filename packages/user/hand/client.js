import { toBuffer, toData } from "../util/buffer-data.js";

export class HandServerClient extends EventTarget {
  #url;
  #user;
  constructor({ url, user }) {
    super();
    this.#url = url;
    this.socket = null;
    this.#user = user;
    this.state = "unauth"; // 未认证：unauth；认证中：authing；认证完成：authed; 已关闭：closed
    this.stateUpdateTime = Date.now(); // 最近更新状态时间
    this.delay = 0; // 延迟时间
    this.serverName = null; // 服务器名称
    this.serverVersion = null; // 服务器版本
    this.serverCid = null; // 服务器CID

    // 重连相关属性
    this.reconnectAttempts = 0; // 重连尝试次数
    this.maxReconnectAttempts = 5; // 最大重连尝试次数
    this.reconnectDelay = 1000; // 初始重连延迟（毫秒）
    this.maxReconnectDelay = 30000; // 最大重连延迟（毫秒）
    this.reconnectTimeout = null; // 重连定时器
    this.shouldReconnect = true; // 是否应该自动重连
  }

  async init() {
    if (this.socket) {
      return;
    }

    // 重置重连状态
    this.shouldReconnect = true;

    // 创建WebSocket连接
    this.socket = new WebSocket(this.#url);

    // 绑定事件监听器
    this.socket.addEventListener("open", this._onOpen.bind(this));
    this.socket.addEventListener("message", this._onMessage.bind(this));
    this.socket.addEventListener("close", this._onClose.bind(this));
    this.socket.addEventListener("error", this._onError.bind(this));
  }

  // 主动断开连接（不进行重连）
  disconnect() {
    this.shouldReconnect = false;
    this._clearReconnectTimeout();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this._changeState("closed");
  }

  // 重新连接
  async reconnect() {
    // 清除现有连接
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    // 清除重连定时器
    this._clearReconnectTimeout();

    // 初始化新连接
    await this.init();
  }

  // 执行重连逻辑
  _attemptReconnect() {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`重连失败：已达到最大重连次数 ${this.maxReconnectAttempts}`);
      this.dispatchEvent(new CustomEvent("reconnect-failed"));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`${delay}ms 后进行第 ${this.reconnectAttempts} 次重连...`);
    this.dispatchEvent(
      new CustomEvent("reconnecting", {
        detail: { attempt: this.reconnectAttempts, delay },
      })
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.reconnect();
      } catch (error) {
        console.error("重连失败:", error);
        this._attemptReconnect(); // 继续下一次重连尝试
      }
    }, delay);
  }

  // 清除重连定时器
  _clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  async findUser(userId) {
    if (this.state !== "authed") {
      throw new Error("用户未认证");
    }

    await this._send({ type: "find_user", userId });

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("find_user超时"));
      }, 5000);

      const handler = (event) => {
        const data = event.detail;

        if (data.type === "response_find_user" && data.userId === userId) {
          // 判断成功后，注销监听
          this.removeEventListener("message", handler);
          clearTimeout(timeoutId);
          const reData = { ...data };
          delete reData.type;
          resolve(reData);
        }
      };
      this.addEventListener("message", handler);
    });
  }

  // 检查用户是否在线
  async isUserOnline(userId) {
    const userData = await this.findUser(userId);
    return userData.isOnline;
  }

  // 发送数据给指定用户
  sendTo(options, data) {
    if (this.state !== "authed") {
      throw new Error("用户未认证");
    }

    if (typeof options === "string") {
      options = { userId: options };
    }

    if (data instanceof Uint8Array) {
      const reBuffer = toBuffer(data, { type: "agent_data", options });
      this.socket.send(reBuffer);
      return;
    }

    if (options.userId) {
      this._send({ type: "agent_data", options, data });
    }
  }

  _send(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket连接未打开");
    }

    if (typeof data === "object") {
      this.socket.send(JSON.stringify(data));
    }
  }

  // 处理WebSocket打开事件
  _onOpen() {
    // console.log("WebSocket连接已打开");

    // 检查是否是重连成功
    const wasReconnecting = this.reconnectAttempts > 0;

    // 重置重连计数
    this.reconnectAttempts = 0;

    // 触发重连成功事件
    if (wasReconnecting) {
      this.dispatchEvent(new CustomEvent("reconnected"));
    }

    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      this.checkDelay();
    }, 30000);
  }

  async checkDelay() {
    if (this.state !== "authed") {
      throw new Error("用户未认证");
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this._pingTime = Date.now();
      this._send({ type: "ping" });
    }
  }

  // 处理WebSocket消息事件
  async _onMessage(event) {
    let responseData;

    // if (typeof event.data !== "string") {
    if (event.data instanceof Blob) {
      // blob 转 uint8array
      const arrayBuffer = await event.data.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { data, info } = toData(uint8Array);

      if (info.type === "agent_data") {
        this.dispatchEvent(
          new CustomEvent("agent_data", {
            detail: { ...info, data },
          })
        );

        if (this.onData) {
          this.onData(info.fromUserId, data, { ...info, data });
        }

        this.#user.dispatchEvent(
          new CustomEvent("received-server-agent-data", {
            detail: {
              response: { ...info, data },
              server: this,
            },
          })
        );
      }

      return;
    }

    try {
      responseData = JSON.parse(event.data);

      if (responseData.type === "pong") {
        this.delay = Date.now() - this._pingTime;
        this.dispatchEvent(
          new CustomEvent("check-delay", { detail: this.delay })
        );

        this._pingTime = null;

        // 告诉服务端延迟时间
        this._send({ type: "update_delay", delay: this.delay });
        return;
      }
    } catch (e) {
      console.error(e);
      console.log("收到消息:", event.data);
      return;
    }

    if (responseData.type === "need_auth") {
      const info = await this.#user.info();

      // 签名信息
      const signedData = await this.#user.sign({
        cid: responseData.cid,
        userSessionId: this.#user.sessionId,
        info,
      });

      this._changeState("authing");

      // 发送签名信息，证明是用户本人
      this._send({ type: "authentication", signedData });
    } else if (responseData.type === "auth_success") {
      this._changeState("authed");
      this._pingTime = Date.now();
      this._send({ type: "ping" }); // 即使发送延迟测试
    } else if (responseData.type === "agent_data") {
      this.dispatchEvent(
        new CustomEvent("agent-data", { detail: responseData })
      );

      if (this.onData) {
        this.onData(responseData.fromUserId, responseData.data, responseData);
      }

      // console.log("收到agent消息:", responseData);

      this.#user.dispatchEvent(
        new CustomEvent("received-server-agent-data", {
          detail: {
            response: responseData,
            server: this,
          },
        })
      );
    } else if (responseData.type === "server_info") {
      this.serverName = responseData.serverName;
      this.serverVersion = responseData.serverVersion;
      this.serverCid = responseData.cid;
      this.dispatchEvent(
        new CustomEvent("server-info", { detail: responseData })
      );
    }

    this.dispatchEvent(new CustomEvent("message", { detail: responseData }));
  }

  _changeState(state) {
    const oldState = this.state;
    this.state = state;
    this.stateUpdateTime = Date.now(); // 最近更新状态时间

    // 如果状态从非关闭状态变为关闭状态，触发断开事件
    if (oldState !== "closed" && state === "closed") {
      this.dispatchEvent(new CustomEvent("disconnected"));
    }

    this.dispatchEvent(new Event(state));
    this.dispatchEvent(new Event("change-state"));
    if (this.onchange) {
      this.onchange(this);
    }
  }

  // 处理WebSocket关闭事件
  _onClose(event) {
    clearInterval(this.pingInterval);
    this._changeState("closed");
    console.log("WebSocket连接已关闭:", event);

    // 尝试重连（如果应该重连）
    if (this.shouldReconnect) {
      this._attemptReconnect();
    }
  }

  // 处理WebSocket错误事件
  _onError(event) {
    clearInterval(this.pingInterval);
    console.error("WebSocket错误:", event);

    // 触发错误事件
    this.dispatchEvent(new CustomEvent("error", { detail: event }));
  }

  bind(eventName, callback) {
    this.addEventListener(eventName, callback);

    return () => {
      this.removeEventListener(eventName, callback);
    };
  }

  // 配置重连参数
  setReconnectConfig({ maxAttempts, initialDelay, maxDelay }) {
    if (maxAttempts !== undefined) {
      this.maxReconnectAttempts = maxAttempts;
    }
    if (initialDelay !== undefined) {
      this.reconnectDelay = initialDelay;
    }
    if (maxDelay !== undefined) {
      this.maxReconnectDelay = maxDelay;
    }
  }

  // 获取重连状态信息
  getReconnectInfo() {
    return {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay: this.reconnectDelay,
      maxDelay: this.maxReconnectDelay,
      shouldReconnect: this.shouldReconnect,
      isReconnecting: this.reconnectTimeout !== null,
    };
  }
}
