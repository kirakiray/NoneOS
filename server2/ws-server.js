// WebSocketServer.js
export class WebSocketServer {
  constructor(messageHandler, connectHandler) {
    this.wss = null;
    this.clients = new Set(); // 用于存储Bun环境下的客户端连接
    
    // 验证 messageHandler 是否为函数
    if (typeof messageHandler !== 'function') {
      throw new Error('messageHandler 必须是一个函数');
    }
    
    this.messageHandler = messageHandler; // 消息处理回调函数（必需）
    
    // 验证 connectHandler 是否为函数（可选）
    if (connectHandler && typeof connectHandler !== 'function') {
      throw new Error('connectHandler 必须是一个函数');
    }
    
    this.connectHandler = connectHandler; // 连接处理回调函数（可选）
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

        // 如果提供了连接处理回调函数，则调用它
        if (this.connectHandler) {
          this.connectHandler(ws);
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
          // 解析客户端发送的JSON数据
          const message = JSON.parse(data);

          // 调用消息处理回调函数（现在是必需的）
          if (this.messageHandler) {
            this.messageHandler(ws, message);
          } else {
            // 如果没有提供消息处理函数，返回错误
            ws.send(
              JSON.stringify({
                type: "error",
                message: "服务器未配置消息处理函数",
              })
            );
          }
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
      },

      error: (ws, error) => {
        console.error("WebSocket错误:", error);
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
      this.wss.on("connection", (ws) => {
        console.log("新的客户端连接");

        // 如果提供了连接处理回调函数，则调用它
        if (this.connectHandler) {
          this.connectHandler(ws);
        }

        // 向客户端发送欢迎消息
        ws.send(
          JSON.stringify({
            type: "welcome",
            message: "欢迎连接到WebSocket服务器(Node.js)",
          })
        );

        // 监听客户端消息
        ws.on("message", (data) => {
          console.log("收到客户端消息:", data.toString());

          try {
            // 解析客户端发送的JSON数据
            const message = JSON.parse(data.toString());

            // 调用消息处理回调函数（现在是必需的）
            if (this.messageHandler) {
              this.messageHandler(ws, message);
            } else {
              // 如果没有提供消息处理函数，返回错误
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "服务器未配置消息处理函数",
                })
              );
            }
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
        ws.on("close", () => {
          console.log("客户端断开连接");
        });

        // 监听错误事件
        ws.on("error", (err) => {
          console.error("WebSocket错误:", err);
        });
      });
    } catch (error) {
      console.error("无法加载ws库:", error);
    }
  }



  /**
   * 广播消息给所有连接的客户端
   * @param {Object} message - 要广播的消息
   */
  _broadcastMessage(message) {
    const broadcastData = JSON.stringify({
      type: "broadcast",
      message: message.message,
      timestamp: new Date().toISOString(),
    });

    if (typeof Bun !== "undefined") {
      // Bun环境下广播消息
      this.clients.forEach((client) => {
        if (client.readyState === undefined || client.readyState === 1) {
          // Bun WebSocket没有readyState属性，或者1表示OPEN状态
          client.send(broadcastData);
        }
      });
    } else if (this.wss) {
      // Node.js环境下广播消息
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(broadcastData);
        }
      });
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
