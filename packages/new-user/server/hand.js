export class HandServerClient {
  #userSessionId;
  #url;
  constructor({ sessionId, url }) {
    this.#userSessionId = sessionId;
    this.#url = url;
    this.socket = null;
  }

  async init() {
    if (this.socket) {
      return;
    }

    // 创建WebSocket连接
    this.socket = new WebSocket(this.#url);

    // 绑定事件监听器
    this.socket.addEventListener("open", this._onOpen);
    this.socket.addEventListener("message", this._onMessage);
    this.socket.addEventListener("close", this._onClose);
    this.socket.addEventListener("error", this._onError);
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
  _onMessage(event) {
    console.log("收到消息:", event.data);
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
