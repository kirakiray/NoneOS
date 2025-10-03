export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.pingInterval = null;
    this.isConnected = false;
    
    // 绑定事件处理函数
    this.onOpen = this.onOpen.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onError = this.onError.bind(this);
  }

  // 连接WebSocket服务器
  connect() {
    // 创建WebSocket连接
    this.socket = new WebSocket(this.url);

    // 绑定事件监听器
    this.socket.addEventListener("open", this.onOpen);
    this.socket.addEventListener("message", this.onMessage);
    this.socket.addEventListener("close", this.onClose);
    this.socket.addEventListener("error", this.onError);
  }

  // 断开WebSocket连接
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }

  // 发送消息到服务器
  sendMessage(type, message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.onSystemMessage("未连接到服务器");
      return;
    }

    const data = {
      type: type,
      message: message,
    };

    this.socket.send(JSON.stringify(data));
    this.onSentMessage(type, message);
  }

  // 监听连接打开事件
  onOpen(event) {
    this.isConnected = true;
    this.onStatusChange("已连接到服务器", true);
    this.onSystemMessage("WebSocket连接已建立");

    // 设置ping间隔，每30秒发送一次ping
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  // 监听消息接收事件
  onMessage(event) {
    const data = JSON.parse(event.data);
    
    // 处理pong消息
    if (data.type === "pong") {
      this.onSystemMessage("收到服务器pong响应");
      return;
    }
    
    this.onReceivedMessage(data.type, data.message);
  }

  // 监听连接关闭事件
  onClose(event) {
    this.isConnected = false;
    this.onStatusChange("未连接到服务器", false);
    this.onSystemMessage("WebSocket连接已关闭");
    
    // 清除ping间隔
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.socket = null;
  }

  // 监听错误事件
  onError(event) {
    this.onSystemMessage("WebSocket连接发生错误");
    console.error("WebSocket错误:", event);
  }

  // 状态变化回调（需要被外部实现）
  onStatusChange(text, isConnected) {
    // 子类可以重写此方法来处理状态变化
  }

  // 收到系统消息回调（需要被外部实现）
  onSystemMessage(message) {
    // 子类可以重写此方法来处理系统消息
  }

  // 收到服务器消息回调（需要被外部实现）
  onReceivedMessage(type, message) {
    // 子类可以重写此方法来处理收到的消息
  }

  // 发送消息回调（需要被外部实现）
  onSentMessage(type, message) {
    // 子类可以重写此方法来处理发送的消息
  }
}