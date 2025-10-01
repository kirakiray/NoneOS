import { WebSocketClient } from "../client/websocket-client.js";

// 继承自 WebSocketClient 的具体实现类
export class WebSocketUI extends WebSocketClient {
  constructor(url) {
    super(url);

    // 获取页面元素
    this.statusElement = document.getElementById("status");
    this.connectBtn = document.getElementById("connectBtn");
    this.disconnectBtn = document.getElementById("disconnectBtn");
    this.sendBtn = document.getElementById("sendBtn");
    this.messageInput = document.getElementById("messageInput");
    this.messageType = document.getElementById("messageType");
    this.messageHistory = document.getElementById("messageHistory");

    // 绑定事件监听器
    this.bindEventListeners();
  }

  // 绑定页面事件监听器
  bindEventListeners() {
    this.connectBtn.addEventListener("click", () => this.connect());
    this.disconnectBtn.addEventListener("click", () => this.disconnect());
    this.sendBtn.addEventListener("click", () => this.handleSendMessage());

    this.messageInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        this.handleSendMessage();
      }
    });
  }

  // 处理发送消息
  handleSendMessage() {
    const message = this.messageInput.value.trim();
    if (message) {
      const type = this.messageType.value;
      this.sendMessage(type, message);
    }
  }

  // 重写状态变化回调
  onStatusChange(text, isConnected) {
    this.statusElement.textContent = text;
    this.statusElement.className =
      "connection-status " + (isConnected ? "connected" : "disconnected");

    this.connectBtn.disabled = isConnected;
    this.disconnectBtn.disabled = !isConnected;
    this.sendBtn.disabled = !isConnected;
  }

  // 重写系统消息回调
  onSystemMessage(message) {
    this.addMessageToHistory(`系统: ${message}`, "system");
  }

  // 重写收到消息回调
  onReceivedMessage(type, message) {
    this.addMessageToHistory(`服务器: ${type} - ${message}`, "received");
  }

  // 重写发送消息回调
  onSentMessage(type, message) {
    this.addMessageToHistory(`客户端: ${type} - ${message}`, "sent");
    this.messageInput.value = "";
  }

  // 添加消息到历史记录
  addMessageToHistory(message, type) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${type}`;
    messageElement.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    this.messageHistory.appendChild(messageElement);
    this.messageHistory.scrollTop = this.messageHistory.scrollHeight;
  }

  // 初始化页面
  init() {
    this.addMessageToHistory(
      '系统: 页面已加载，请点击"连接服务器"按钮开始连接',
      "system"
    );
  }
}
