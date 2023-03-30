import WebSocketClient from "./WebSocketClient.mjs";
import Connecter from "./Connecter.mjs";

const bindClient = (client, connector, remoteUserId) => {
  connector.userId = remoteUserId;

  client.connectors.push(connector);

  const event = new Event("connector-change");
  event.add = connector;
  client.dispatchEvent(event);

  let f;
  connector.addEventListener(
    "close",
    (f = () => {
      const id = client.connectors.indexOf(connector);
      if (id > -1) {
        client.connectors.splice(id, 1);
      }
      connector.removeEventListener("close", f);

      const e = new Event("connector-change");
      e.remove = connector;
      client.dispatchEvent(e);
    })
  );
};

async function connectUser() {
  const { client, userId: remoteUserId, _agrees } = this;

  const connector = new Connecter(_agrees);

  bindClient(client, connector, remoteUserId);

  let f;

  client.addEventListener(
    "switch",
    (f = async (e) => {
      const { data, from } = e;

      if (remoteUserId === from) {
        const { desc: remoteDesc, ices: remoteIces } = data;

        switch (data.type) {
          case "exchange-answer":
            connector.setRemoteDesc(remoteDesc);
            connector.addIces(remoteIces);
            client.removeEventListener("switch", f);
            break;
        }
      }
    })
  );

  const desc = await connector.offer();
  const ices = await connector.ices;

  client.sendById(remoteUserId, {
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
    this._agrees = [];
    if (userData.ws) {
      this.lookup(userData.ws);
    }
  }

  get users() {
    const users = [];
    const { _agrees } = this;

    this.wsClients.forEach((client) => {
      users.push(
        ...client.users.map((e) => {
          return {
            ...e,
            get client() {
              return client;
            },
            get connector() {
              return client.connectors.find((e2) => e2.userId === e.id);
            },

            connect() {
              if (this.connector) {
                throw "The current user has connected";
              }

              return connectUser.call({
                userId: e.id,
                client,
                _agrees,
              });
            },
          };
        })
      );
    });

    return users;
  }

  get connectors() {
    const connectors = [];

    this.wsClients.forEach((client) => {
      connectors.push(...client.connectors);
    });

    return connectors;
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
    const exitedClient = this.wsClients.find((e) => e.url === url);

    if (exitedClient) {
      exitedClient.socket;
      return exitedClient;
    }

    return new Promise((resolve) => {
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
            const event = new Event("update-users");
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
          case "error":
            console.error(e.data);
            break;
        }
      });

      const eventBindFun = (event) => {
        const e = new Event(`ws-${event.type}`);
        e.client = client;
        this.dispatchEvent(e);
      };

      client.addEventListener("open", eventBindFun);
      client.addEventListener("close", eventBindFun);
      client.addEventListener("error", eventBindFun);

      client.addEventListener("switch", async (e) => {
        const { data, from } = e;

        const { desc: remoteDesc, ices: remoteIces } = data;

        switch (data.type) {
          case "exchange-offer":
            const connector = new Connecter(this._agrees);

            const desc = await connector.answer(remoteDesc);
            connector.addIces(remoteIces);

            const ices = await connector.ices;

            client.sendById(from, {
              type: "exchange-answer",
              ices,
              desc,
            });

            bindClient(client, connector, from);

            break;
        }
      });

      client.addEventListener("connector-change", (e) => {
        const event = new Event("connector-change");
        event.client = client;
        event.add = e.add;
        event.remove = e.remove;
        this.dispatchEvent(event);
      });

      resolve(client);
    });
  }

  agree(task) {
    this._agrees.push(task);
  }
}
