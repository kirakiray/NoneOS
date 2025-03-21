import * as handlers from "./handlers/index.js";

// 全局连接管理
export const activeConnections = new Set(); // 存储所有活动的WebSocket连接
export const authenticatedUsers = new Map(); // 存储已认证用户的信息

// 读取当前 packagejson 的文件信息
import { readFile } from "node:fs/promises";
const packageJson = JSON.parse(
  await readFile(new URL("./package.json", import.meta.url))
);

const serverVersion = packageJson.version;

export class ServerHandClient {
  constructor(webSocket, { serverOptions } = {}) {
    this._webSocket = webSocket; // WebSocket连接
    this._userId = null; // 用户ID
    this._serverName = serverOptions.name || "unknown server"; // 服务器名称
    this.userInfo = {}; // 存储用户信息
    this.authedData = null; // 验证用的数据

    // 生成唯一的会话标识符
    this.sessionId = Math.random().toString(36).slice(2);

    // 设置认证超时处理（5秒内必须完成认证）
    this._authenticationTimer = setTimeout(() => {
      this._webSocket.close();
    }, 5000);

    activeConnections.add(this);

    // 发送初始化消息，包含会话标识符
    this.sendMessage({
      type: "init",
      mark: this.sessionId,
    });

    // 处理接收到的消息
    webSocket.on("message", async (message) => {
      console.log("接收到客户端消息:", message.toString());

      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message.toString());
      } catch (error) {
        console.log("消息格式错误：非JSON格式");
        return;
      }

      if (handlers[parsedMessage.type]) {
        try {
          const redata = await handlers[parsedMessage.type](
            parsedMessage,
            this,
            { serverOptions, serverVersion }
          );

          // 发送认证成功响应
          this.sendMessage(redata);
        } catch (error) {
          // 处理错误并发送错误响应给客户端
          console.error("处理消息时发生错误:", error);
          this.sendMessage({
            type: "error",
            error: error.message || "处理请求时发生错误",
          });
        }
        return;
      }

      if (parsedMessage.type === "ping") {
        this.sendMessage({
          type: "pong",
        });
        return;
      }

      // 没有找到对应的消息处理函数
      console.error("未找到对应的消息处理函数", parsedMessage);
    });

    // 处理连接关闭
    webSocket.on("close", () => {
      this.cleanup();
      console.log("客户端连接已关闭");
    });

    // 处理错误
    webSocket.on("error", (error) => {
      this.cleanup();
      console.log("WebSocket错误:", error);
    });
  }

  // 发送消息到客户端
  sendMessage(data) {
    this._webSocket.send(JSON.stringify(data));
  }

  // 关闭连接
  closeConnection() {
    this._webSocket.close();
  }

  // 清理连接资源
  cleanup() {
    activeConnections.delete(this);
    // 确认是这个对象才进行删除，避免删除其他对象的用户信息
    if (this._userId && authenticatedUsers.get(this._userId) === this) {
      authenticatedUsers.delete(this._userId);
    }
  }
}
