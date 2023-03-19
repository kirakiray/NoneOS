import { WebSocketServer } from "ws";

export class ConnectorServer {
  constructor({ port = 3900 } = {}) {
    const wss = (this.wss = new WebSocketServer({ port }));

    const users = new Set();

    // 监听 WebSocket 连接事件
    wss.on("connection", (ws) => {
      const user = {};

      users.add(user);

      console.log("client connected , all user => ", users);

      // 监听客户端发送的消息
      ws.on("message", (message) => {
        const msg = JSON.parse(message);

        // console.log(`received: `, msg);

        switch (msg.action) {
          case "init":
            user.desc = msg.desc;
            user.userName = msg.userName;
            break;
        }

        // 发送消息给客户端
        // ws.send(`server received: ${message}`);
      });

      // 监听 WebSocket 连接断开事件
      ws.on("close", () => {
        console.log("client disconnected");
        users.delete(user);
      });
    });
  }
}
