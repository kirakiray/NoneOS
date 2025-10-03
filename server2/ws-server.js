// WebSocketServer.js
// 兼容 nodejs 和 bun 环境的 WebSocket 服务器类
export class WebSocketServer {
  constructor(options = {}) {
    this.wss = null;
    this.clients = new Set(); // 用于存储Bun环境下的客户端连接
    this.clientInfo = new Map(); // 存储客户端信息

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
        this.clients.add(ws);

        // 记录客户端信息
        const clientId = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}`;
        ws._clientId = clientId;
        this.clientInfo.set(ws, {
          id: clientId,
          connectTime: new Date(),
          // 注意：Bun环境下获取客户端IP的方法可能不同
        });

        // 如果提供了连接处理回调函数，则调用它
        if (this.onConnect) {
          this.onConnect(ws);
        }

        // 向客户端发送欢迎消息
        ws.send(
          JSON.stringify({
            type: "welcome",
            message: "欢迎连接到WebSocket服务器(Bun)",
          })
        );
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
        this.clients.delete(ws);

        // 清理客户端信息
        this.clientInfo.delete(ws);

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

        // 记录客户端信息
        const clientId = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}`;

        ws._clientId = clientId;
        this.clientInfo.set(ws, {
          id: clientId,
          connectTime: new Date(),
          ip: req.socket.remoteAddress,
        });

        // 如果提供了连接处理回调函数，则调用它
        if (this.onConnect) {
          this.onConnect(ws);
        }

        // 向客户端发送欢迎消息
        ws.send(
          JSON.stringify({
            type: "welcome",
            message: "欢迎连接到WebSocket服务器(Node.js)",
          })
        );

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

          // 清理客户端信息
          this.clientInfo.delete(ws);

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
   * 获取所有连接的客户端信息
   * @returns {Array} 客户端信息数组
   */
  getConnectionsInfo() {
    const clientsInfo = [];

    if (typeof Bun !== "undefined") {
      // Bun环境下获取客户端信息
      this.clients.forEach((client) => {
        const info = this.clientInfo.get(client);
        if (info) {
          clientsInfo.push({
            id: info.id,
            connectTime: info.connectTime,
            // Bun环境下暂时无法获取IP地址
          });
        }
      });
    } else if (this.wss) {
      // Node.js环境下获取客户端信息
      this.wss.clients.forEach((client) => {
        const info = this.clientInfo.get(client);
        if (info) {
          clientsInfo.push({
            id: info.id,
            connectTime: info.connectTime,
            ip: info.ip,
          });
        }
      });
    }

    return clientsInfo;
  }

  /**
   * 断开指定客户端的连接
   * @param {string} clientId - 客户端ID
   */
  disconnectClient(clientId) {
    let clientToDisconnect = null;

    if (typeof Bun !== "undefined") {
      // Bun环境下查找并断开客户端连接
      for (const client of this.clients) {
        const info = this.clientInfo.get(client);
        if (info && info.id === clientId) {
          clientToDisconnect = client;
          break;
        }
      }

      if (clientToDisconnect) {
        clientToDisconnect.close();
      }
    } else if (this.wss) {
      // Node.js环境下查找并断开客户端连接
      for (const client of this.wss.clients) {
        const info = this.clientInfo.get(client);
        if (info && info.id === clientId) {
          clientToDisconnect = client;
          break;
        }
      }

      if (clientToDisconnect) {
        clientToDisconnect.close();
      }
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
