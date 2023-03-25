import WebSocketClient from "./WebSocketClient.mjs";
import Connecter from "./Connecter.mjs";

async function connectUser() {
  const { client, userId } = this;

  const connector = new Connecter();

  window.connector = connector;

  let f;

  client.addEventListener(
    "switch",
    (f = async (e) => {
      const { data, from } = e;

      if (userId === from) {
        const { desc: remoteDesc, ices: remoteIces } = data;

        switch (data.type) {
          case "exchange-answer":
            connector.setRemoteDesc(remoteDesc);
            connector.addIces(remoteIces);
            client.removeEventListener("switch", f);
            break;
        }
      }

      console.log("data => ", from, data);
    })
  );

  const desc = await connector.offer();
  const ices = await connector.ices;

  client.sendById(userId, {
    type: "exchange-offer",
    desc,
    ices,
  });
}

export default class RTCAgent extends EventTarget {
  constructor(userData) {
    super();
    this.userName = userData.userName;
    this.id = userData.id;
    this.publicKey = userData.publicKey;
    this.wsClients = [];
    if (userData.ws) {
      this.lookup(userData.ws);
    }
  }

  get users() {
    const users = [];

    this.wsClients.forEach((client) => {
      users.push(
        ...client.users.map((e) => {
          return {
            ...e,
            get client() {
              return client;
            },
            connect: connectUser.bind({ userId: e.id, client }),
          };
        })
      );
    });

    return users;
  }

  update(data = {}) {
    const { userName = this.userName } = data;

    Object.assign(this, {
      userName,
    });

    this.wsClients.forEach((client) => {
      client.send({
        action: "init",
        userName: this.userName,
        id: this.id,
      });
    });
  }

  lookup(url) {
    return new Promise((resolve, reject) => {
      const client = new WebSocketClient(url);

      this.wsClients.push(client);

      client.send({
        action: "init",
        userName: this.userName,
        id: this.id,
      });

      client.addEventListener("message", (e) => {
        const { action, data, from } = e.data;

        switch (action) {
          case "push-users":
            client.users = data;
            resolve(client);
            const event = new Event("updateUsers");
            event.client = client;
            this.dispatchEvent(event);

            break;
          case "switch":
            const e = new Event("switch");
            e.data = data;
            e.from = from;
            client.dispatchEvent(e);
            e.client = client;
            this.dispatchEvent(e);
            break;
        }
      });

      const closeFunc = (event) => {
        const index = this.wsClients.indexOf(client);

        if (index > -1) {
          this.wsClients.splice(index, 1);
        }
        reject(event);
      };

      client.addEventListener("close", closeFunc);
      client.addEventListener("error", closeFunc);

      client.addEventListener("switch", async (e) => {
        const { data, from } = e;

        const { desc: remoteDesc, ices: remoteIces } = data;

        switch (data.type) {
          case "exchange-offer":
            const connector = new Connecter();

            window.connector = connector;

            const desc = await connector.answer(remoteDesc);
            connector.addIces(remoteIces);

            const ices = await connector.ices;

            client.sendById(from, {
              type: "exchange-answer",
              ices,
              desc,
            });
            break;
        }

        console.log("data => ", from, data);
      });
    });
  }
}
