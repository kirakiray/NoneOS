import { WebSocketServer } from "ws";

export class ConnectorServer {
  constructor({ port = 3900 } = {}) {
    const wss = (this.wss = new WebSocketServer({ port }));

    const users = (this.users = new Map());

    const userToJSON = function () {
      return {
        id: this.id,
        userName: this.userName,
      };
    };

    wss.on("connection", (ws) => {
      const user = {
        ws,
        toJSON: userToJSON,
      };

      ws.on("message", (message) => {
        const msg = JSON.parse(message);

        switch (msg.action) {
          case "init":
            user.id = msg.id;
            user.userName = msg.userName;
            users.set(user.id, user);

            ws.send(
              JSON.stringify({
                action: "push-users",
                data: Array.from(users.values()).filter((e) => e.id !== msg.id),
              })
            );

            console.log("client connected , all user => ", users);
            break;
          case "switch":
            const targetUser = users.get(msg.to);

            targetUser.ws.send(
              JSON.stringify({
                action: "switch",
                from: user.id,
                data: msg.data,
              })
            );

            console.log("switch data => ", msg.data);

            break;
        }
      });

      ws.on("close", () => {
        console.log("client disconnected");
        user.ws = null;
        users.delete(user.id);
      });
    });
  }
}
