export class HandServerClient extends EventTarget {
  #url;
  #user;
  constructor({ url, user }) {
    super();
    this.#url = url;
    this.socket = null;
    this.#user = user;
    this.state = "unauth"; // 未认证：unauth；认证中：authing；认证完成：authed
  }

  async init() {
    if (this.socket) {
      return;
    }

    // 创建WebSocket连接
    this.socket = new WebSocket(this.#url);

    // 绑定事件监听器
    this.socket.addEventListener("open", this._onOpen.bind(this));
    this.socket.addEventListener("message", this._onMessage.bind(this));
    this.socket.addEventListener("close", this._onClose.bind(this));
    this.socket.addEventListener("error", this._onError.bind(this));
  }

  async isUserOnline(userId) {
    if (this.state !== "authed") {
      throw new Error("用户未认证");
    }

    await this.send({ type: "is_user_online", userId });

    return new Promise((resolve, reject) => {
      const handler = (event) => {
        const data = event.detail;

        if (data.type === "response_user_online" && data.userId === userId) {
          // 判断成功后，注销监听
          this.removeEventListener("message", handler);
          resolve(data.isOnline);
        }
      };
      this.addEventListener("message", handler);
    });
  }

  sendData(options, data) {
    if (this.state !== "authed") {
      throw new Error("用户未认证");
    }

    if (options.userId) {
      this.send({ type: "agent_data", options, data });
    }
  }

  send(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket连接未打开");
    }

    if (typeof data === "object") {
      this.socket.send(JSON.stringify(data));
    }
  }

  // 处理WebSocket打开事件
  _onOpen() {
    console.log("WebSocket连接已打开");

    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send({ type: "ping" });
      }
    }, 30000);
  }

  // 处理WebSocket消息事件
  async _onMessage(event) {
    let data;

    try {
      data = JSON.parse(event.data);

      if (data.type === "pong") {
        return;
      }

      console.log("收到消息:", data);
    } catch (e) {
      console.log("收到消息:", event.data);
      console.error(e);
      return;
    }

    if (data.type === "need_auth") {
      const info = await this.#user.info();

      // 签名信息
      const signedData = await this.#user.sign({
        cid: data.cid,
        userSessionId: this.#user.sessionId,
        info,
      });

      this._changeState("authing");

      // 发送签名信息，证明是用户本人
      this.send({ type: "authentication", signedData });
    } else if (data.type === "auth_success") {
      this._changeState("authed");
    } else if (data.type === "agent_data") {
      this.dispatchEvent(new CustomEvent("agent_data", { detail: data }));
      if (this.onData) {
        this.onData(data.fromUserId, data.data);
      }
    }

    this.dispatchEvent(new CustomEvent("message", { detail: data }));
  }

  _changeState(state) {
    this.state = state;
    this.dispatchEvent(new Event(state));
    if (this.onchange) {
      this.onchange(this);
    }
  }

  // 处理WebSocket关闭事件
  _onClose(event) {
    clearInterval(this.pingInterval);
    console.log("WebSocket连接已关闭:", event);
  }

  // 处理WebSocket错误事件
  _onError(event) {
    clearInterval(this.pingInterval);
    console.error("WebSocket错误:", event);
  }
}
