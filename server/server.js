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
      ws.send(
        JSON.stringify({
          action: "push-users",
          data: Array.from(users.values()),
        })
      );

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

            console.log(targetUser, msg);
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
