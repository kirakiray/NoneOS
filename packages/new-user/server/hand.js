export class HandServerClient extends EventTarget {
  #url;
  #user;
  constructor({ sessionId, url, user }) {
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

  // 处理WebSocket打开事件
  _onOpen() {
    console.log("WebSocket连接已打开");

    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));
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
      this.socket.send(JSON.stringify({ type: "authentication", signedData }));
    } else if (data.type === "auth_success") {
      this._changeState("authed");
    }

    this.dispatchEvent(new Event("message", { detail: data }));
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
