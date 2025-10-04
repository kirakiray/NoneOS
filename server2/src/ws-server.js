// WebSocketServer.js
// 兼容 nodejs 和 bun 环境的 WebSocket 服务器类
export class WebSocketServer {
  constructor(options = {}) {
    this.wss = null;

    // 解构options对象，设置默认值
    const { onMessage, onConnect, onClose, onError } = options;

    // 验证 onMessage 是否为函数
    if (typeof onMessage !== "function") {
      throw new Error("onMessage 必须是一个函数");
    }

    this.onMessage = onMessage; // 消息处理回调函数（必需）

    // 验证 onConnect 是否为函数（可选）
    if (onConnect && typeof onConnect !== "function") {
      throw new Error("onConnect 必须是一个函数");
    }

    this.onConnect = onConnect; // 连接处理回调函数（可选）

    // 验证 onClose 是否为函数（可选）
    if (onClose && typeof onClose !== "function") {
      throw new Error("onClose 必须是一个函数");
    }

    this.onClose = onClose; // 连接关闭处理回调函数（可选）

    // 验证 onError 是否为函数（可选）
    if (onError && typeof onError !== "function") {
      throw new Error("onError 必须是一个函数");
    }

    this.onError = onError; // 错误处理回调函数（可选）
  }

  /**
   * 启动WebSocket服务器
   * @param {number} port - 服务器监听端口
   */
  start(port = 8080) {
    if (typeof Bun !== "undefined") {
      this._startBunServer(port);
    } else {
      this._startNodeServer(port);
    }
  }

  /**
   * 在Bun环境下启动WebSocket服务器
   * @param {number} port - 服务器监听端口
   */
  _startBunServer(port) {
    console.log("使用Bun原生WebSocket服务器");

    // 创建WebSocket处理器
    const websocketHandler = {
      open: (ws) => {
        console.log("新的客户端连接");

        // 如果提供了连接处理回调函数，则调用它
        if (this.onConnect) {
          this.onConnect(ws);
        }
      },

      message: (ws, data) => {
        console.log("收到客户端消息:", data);

        try {
          // 检查是否为二进制数据
          if (
            data instanceof ArrayBuffer ||
            data instanceof Uint8Array ||
            data instanceof Buffer ||
            (typeof data !== "string" && !(data instanceof String))
          ) {
            // 对于二进制数据或非字符串数据，直接传递给 onMessage 处理函数
            this.onMessage(ws, data);

            return;
          }

          // 解析客户端发送的JSON数据
          const message = JSON.parse(data);

          // 调用消息处理回调函数（现在是必需的）
          this.onMessage(ws, message);
        } catch (error) {
          console.error("处理消息时出错:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "消息格式错误",
            })
          );
        }
      },

      close: (ws, code, message) => {
        console.log("客户端断开连接:", code, message);

        // 如果提供了连接关闭处理回调函数，则调用它
        if (this.onClose) {
          this.onClose(ws, code, message);
        }
      },

      error: (ws, error) => {
        console.error("WebSocket错误:", error);

        // 如果提供了错误处理回调函数，则调用它
        if (this.onError) {
          this.onError(ws, error);
        }
      },
    };

    // 使用Bun.serve创建HTTP服务器并处理WebSocket连接
    this.server = Bun.serve({
      port: port,
      fetch: (req, server) => {
        // 升级到WebSocket连接
        if (server.upgrade(req)) {
          return; // 不返回响应，因为连接已升级为WebSocket
        }

        // 对于非WebSocket请求，返回404
        return new Response("无法找到该页面", { status: 404 });
      },

      websocket: websocketHandler,
    });

    console.log(`Bun WebSocket服务器启动，监听端口 ${port}`);
  }

  /**
   * 在Node.js环境下启动WebSocket服务器
   * @param {number} port - 服务器监听端口
   */
  async _startNodeServer(port) {
    console.log("使用Node.js ws库");

    try {
      const { WebSocketServer } = await import("ws");

      // 创建WebSocket服务器，监听在指定端口
      this.wss = new WebSocketServer({ port: port });

      console.log(`WebSocket服务器启动，监听端口 ${port}`);

      // 处理连接事件
      this.wss.on("connection", (ws, req) => {
        console.log("新的客户端连接");

        // 如果提供了连接处理回调函数，则调用它
        if (this.onConnect) {
          this.onConnect(ws);
        }

        // 监听客户端消息
        ws.on("message", (data, isBinary) => {
          console.log("收到客户端消息:", data.toString());

          try {
            // 检查是否为二进制数据
            if (isBinary) {
              // 对于二进制数据，直接传递给 onMessage 处理函数
              this.onMessage(ws, data);
              return;
            }

            // 解析客户端发送的JSON数据
            const message = JSON.parse(data.toString());

            // 调用消息处理回调函数（现在是必需的）
            this.onMessage(ws, message);
          } catch (error) {
            console.error("处理消息时出错:", error);
            ws.send(
              JSON.stringify({
                type: "error",
                message: "消息格式错误",
              })
            );
          }
        });

        // 监听连接关闭事件
        ws.on("close", (code, reason) => {
          console.log("客户端断开连接");

          // 如果提供了连接关闭处理回调函数，则调用它
          if (this.onClose) {
            this.onClose(ws, code, reason);
          }
        });

        // 监听错误事件
        ws.on("error", (err) => {
          console.error("WebSocket错误:", err);

          // 如果提供了错误处理回调函数，则调用它
          if (this.onError) {
            this.onError(ws, err);
          }
        });
      });
    } catch (error) {
      console.error("无法加载ws库:", error);
    }
  }

  /**
   * 停止WebSocket服务器
   */
  stop() {
    if (typeof Bun !== "undefined" && this.server) {
      this.server.stop();
      console.log("Bun WebSocket服务器已停止");
    } else if (this.wss) {
      this.wss.close();
      console.log("Node.js WebSocket服务器已停止");
    }
  }
}
