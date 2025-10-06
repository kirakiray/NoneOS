import { toBuffer, toData } from "../buffer-data.js";

export class HandServerClient extends EventTarget {
  #url;
  #user;
  constructor({ url, user }) {
    super();
    this.#url = url;
    this.socket = null;
    this.#user = user;
    this.state = "unauth"; // 未认证：unauth；认证中：authing；认证完成：authed
    this.delay = 0;
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

  async findUser(userId) {
    if (this.state !== "authed") {
      throw new Error("用户未认证");
    }

    await this._send({ type: "find_user", userId });

    return new Promise((resolve, reject) => {
      const handler = (event) => {
        const data = event.detail;

        if (data.type === "response_find_user" && data.userId === userId) {
          // 判断成功后，注销监听
          this.removeEventListener("message", handler);
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
    console.log("WebSocket连接已打开");

    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this._pingTime = Date.now();
        this._send({ type: "ping" });
      }
    }, 30000);
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

      console.log("收到消息:", responseData);
    } catch (e) {
      console.log("收到消息:", event.data);
      console.error(e);
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
    }

    this.dispatchEvent(new CustomEvent("message", { detail: responseData }));
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
