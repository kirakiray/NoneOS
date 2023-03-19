import { WebSocketServer } from "ws";

export class ConnectorServer {
  constructor({ port = 3900 } = {}) {
    const wss = (this.wss = new WebSocketServer({ port }));

    const users = (this.users = new Set());

    wss.on("connection", (ws) => {
      ws.send(
        JSON.stringify({
          action: "push-users",
          users: Array.from(users),
        })
      );

      const user = {};

      users.add(user);

      console.log("client connected , all user => ", users);

      ws.on("message", (message) => {
        const msg = JSON.parse(message);

        switch (msg.action) {
          case "init":
            user.desc = msg.desc;
            user.userName = msg.userName;
            break;
          case "switch":
            break;
        }
      });

      ws.on("close", () => {
        console.log("client disconnected");
        users.delete(user);
      });
    });
  }
}
