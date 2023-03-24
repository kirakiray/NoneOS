export class WebSocketClient extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
    this._socket = null;
    this.socket;
  }

  get socket() {
    if (!this._socket) {
      this._socket = new Promise((resolve, reject) => {
        const socket = new WebSocket(this.url);

        socket.addEventListener("open", (event) => {
          // console.log("WebSocket is open");
          resolve(socket);

          this.dispatchEvent(new Event("open"));
        });

        socket.addEventListener("message", (event) => {
          const e = new Event("message");
          e.data = JSON.parse(event.data);
          this.dispatchEvent(e);
        });

        socket.addEventListener("close", (event) => {
          // console.log("WebSocket is closed");
          this._socket = null;
          reject();
          this.dispatchEvent(new Event("close", event));

          console.error(event);
        });

        socket.addEventListener("error", (event) => {
          this._socket = null;
          reject();
          this.dispatchEvent(new Event("close", event));
          // console.error("WebSocket error occurred");
        });
      });
    }

    return this._socket;
  }

  async send(message) {
    (await this.socket).send(
      message instanceof Object ? JSON.stringify(message) : message
    );
  }

  async close() {
    (await this.socket).close();
  }
}

export class Connecter extends EventTarget {
  constructor() {
    super();
    const pc = (this._pc = new RTCPeerConnection());

    pc.addEventListener("connectionstatechange", () => {
      console.log("connectionState:", pc.connectionState);
    });

    this._channel = null;
    this.onmessage = null;

    this.ices = new Promise((resolve) => {
      const ices = [];

      pc.addEventListener("icecandidate", (event) => {
        if (event.candidate) {
          ices.push(event.candidate);
        } else {
          resolve(ices);
        }
      });
    });
  }

  async offer() {
    const pc = this._pc;

    const channel = (this._channel = pc.createDataChannel("sendDataChannel"));

    channel.onmessage = (e) => {
      console.log("pc1 get message => ", e.data);
      if (this.onmessage) {
        this.onmessage(e.data);
      }
    };

    channel.addEventListener("close", () => {
      console.log("Data channel closed");
    });

    const desc = await pc.createOffer();

    pc.setLocalDescription(desc);

    return desc;
  }

  addIces(ices) {
    if (ices instanceof Array) {
      ices.forEach((ice) => this._pc.addIceCandidate(ice));
    } else {
      this._pc.addIceCandidate(ices);
    }
  }

  setRemoteDesc(desc) {
    this._pc.setRemoteDescription(desc);
  }

  async answer(remoteDesc) {
    const pc = this._pc;

    pc.ondatachannel = (e) => {
      const { channel } = e;

      this._channel = channel;

      channel.onmessage = (event) => {
        console.log("pc2 get message => ", event.data);
        if (this.onmessage) {
          this.onmessage(event.data);
        }
      };
    };

    pc.setRemoteDescription(remoteDesc);

    const desc = await pc.createAnswer();
    pc.setLocalDescription(desc);

    return desc;
  }

  send(text) {
    this._channel.send(text);
  }
}

export class RTCAgent extends EventTarget {
  constructor(userData) {
    super();
    this.userName = userData.userName;
    this.id = userData.id;
    this.publicKey = userData.publicKey;
    this.wsClients = [];
    // this._initWS().then(() => this._initRTC());
    if (userData.ws) {
      this.lookup(userData.ws);
    }
  }

  get users() {
    const users = [];

    this.wsClients.forEach((client) => {
      users.push(...client.users);
    });

    return users;
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
            this._onswitch({ data, from });
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
    });
  }

  // _initWS() {
  //   return new Promise((resolve, reject) => {
  //     this._client = new WebSocketClient("ws://localhost:3900");

  //     this._client.send({
  //       action: "init",
  //       userName: this.userName,
  //       id: this.id,
  //     });

  //     this._client.onmessage = (e) => {
  //       const { action, data, from } = JSON.parse(e);

  //       switch (action) {
  //         case "push-users":
  //           this._users = data;
  //           resolve();
  //           break;
  //         case "switch":
  //           this._onswitch({ data, from });
  //           break;
  //       }
  //     };
  //   });
  // }

  async _initRTC() {
    const connector = new Connecter();

    window.connector = this._connector = connector;

    this._onswitch = async ({ data, from }) => {
      const { desc: remoteDesc, ices: remoteIces } = data;

      switch (data.type) {
        case "exchange-offer":
          const desc = await connector.answer(remoteDesc);
          connector.addIces(remoteIces);

          const ices = await connector.ices;

          this.sendById(from, {
            type: "exchange-answer",
            ices,
            desc,
          });
          break;

        case "exchange-answer":
          connector.setRemoteDesc(remoteDesc);
          connector.addIces(remoteIces);
          break;
      }
      console.log("data => ", from, data);
    };

    if (this._users?.length) {
      const targetUser = this._users[0];

      const desc = await connector.offer();
      const ices = await connector.ices;

      this.sendById(targetUser.id, {
        type: "exchange-offer",
        desc,
        ices,
      });
    }
  }

  sendById(id, data) {
    this._client.send({
      action: "switch",
      to: id,
      data,
    });
  }
}
