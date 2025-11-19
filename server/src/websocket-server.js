export class WebSocketServer {
  constructor(options = {}) {
    this.wss = null;
    this.server = null;
    
    const { onMessage, onConnect, onClose, onError } = options;
    
    if (typeof onMessage !== "function") {
      throw new Error("onMessage 必须是一个函数");
    }
    
    this.onMessage = onMessage;
    this.onConnect = onConnect;
    this.onClose = onClose;
    this.onError = onError;
  }

  start(port = 8080) {
    if (typeof Bun !== "undefined") {
      this._startBunServer(port);
    } else {
      this._startNodeServer(port);
    }
  }

  _startBunServer(port) {
    console.log("使用Bun原生WebSocket服务器");
    
    const websocketHandler = {
      open: (ws) => {
        if (this.onConnect) {
          this.onConnect(ws);
        }
      },
      
      message: (ws, data) => {
        try {
          if (this._isBinaryData(data)) {
            this.onMessage(ws, data);
            return;
          }
          
          const message = JSON.parse(data);
          this.onMessage(ws, message);
        } catch (error) {
          console.error("处理消息时出错:", error);
          ws.send(JSON.stringify({ type: "error", message: "消息格式错误" }));
        }
      },
      
      close: (ws, code, message) => {
        if (this.onClose) {
          this.onClose(ws, code, message);
        }
      },
      
      error: (ws, error) => {
        if (this.onError) {
          this.onError(ws, error);
        }
      },
    };

    this.server = Bun.serve({
      port: port,
      fetch: (req, server) => {
        if (server.upgrade(req)) {
          return;
        }
        return new Response("无法找到该页面", { status: 404 });
      },
      websocket: websocketHandler,
    });

    console.log(`Bun WebSocket服务器启动，监听端口 ${port}`);
  }

  async _startNodeServer(port) {
    console.log("使用Node.js ws库");
    
    try {
      const { WebSocketServer } = await import("ws");
      
      this.wss = new WebSocketServer({ port: port });
      console.log(`WebSocket服务器启动，监听端口 ${port}`);
      
      this.wss.on("connection", (ws, req) => {
        if (this.onConnect) {
          this.onConnect(ws);
        }
        
        ws.on("message", (data, isBinary) => {
          try {
            if (isBinary) {
              this.onMessage(ws, data);
              return;
            }
            
            const message = JSON.parse(data.toString());
            this.onMessage(ws, message);
          } catch (error) {
            console.error("处理消息时出错:", error);
            ws.send(JSON.stringify({ type: "error", message: "消息格式错误" }));
          }
        });
        
        ws.on("close", (code, reason) => {
          if (this.onClose) {
            this.onClose(ws, code, reason);
          }
        });
        
        ws.on("error", (err) => {
          if (this.onError) {
            this.onError(ws, err);
          }
        });
      });
    } catch (error) {
      console.error("无法加载ws库:", error);
    }
  }

  _isBinaryData(data) {
    return data instanceof ArrayBuffer || 
           data instanceof Uint8Array || 
           data instanceof Buffer ||
           (typeof data !== "string" && !(data instanceof String));
  }

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