/**
 * 消息路由器类
 * 负责处理来自客户端的消息，根据消息类型分发到相应的处理器
 */
import { pack, unpack } from "../../packages/user/util/pack.js";
import * as routerData from "./router/index.js";

export class MessageRouter {
  /**
   * 构造函数，初始化消息路由器
   * @param {ClientManager} clientManager - 客户端管理器实例
   * @param {string} adminPassword - 管理员密码
   */
  constructor({ clientManager, password }) {
    this.clientManager = clientManager;
    this.adminPassword = password;
    this.handlers = new Map();
    this._setupDefaultHandlers();
  }

  /**
   * 设置默认消息处理器
   */
  _setupDefaultHandlers() {
    // 基础消息处理
    for (let [name, handler] of Object.entries(routerData)) {
      this.register(name, handler, handler.admin);
    }
  }

  /**
   * 注册消息处理器
   * @param {string} messageType - 消息类型
   * @param {Function} handler - 处理器函数
   * @param {boolean} requireAdmin - 是否需要管理员权限，默认false
   */
  register(messageType, handler, requireAdmin = false) {
    this.handlers.set(messageType, { handler, requireAdmin });
  }

  /**
   * 处理接收到的消息
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {Object|string|Buffer} message - 接收到的消息
   */
  async handleMessage(ws, message) {
    const client = ws._client;
    if (!client) {
      console.error("客户端未初始化");
      return;
    }

    let binaryData = null;

    // 处理二进制数据
    if (message instanceof Buffer) {
      try {
        const { obj, data } = unpack(message);
        binaryData = data;
        message = obj;
      } catch (error) {
        client.send({ type: "error", message: "二进制数据解析失败" });
        return;
      }
    }

    const handlerInfo = this.handlers.get(message.type);
    if (!handlerInfo) {
      client.send({
        type: "error",
        message: "未知的消息类型",
        response: message,
      });
      return;
    }

    // 检查管理员权限
    if (handlerInfo.requireAdmin) {
      if (message.password !== this.adminPassword) {
        client.send({ type: "error", message: "密码错误" });
        return;
      }
    }

    try {
      await handlerInfo.handler.call(this, {
        client,
        message,
        binaryData,
        clientManager: this.clientManager,
      });
    } catch (error) {
      console.error(`处理消息 ${message.type} 时出错:`, error);
      client.send({
        type: "error",
        message: "消息处理失败",
        error: error.message,
      });
    }
  }
}
