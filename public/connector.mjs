export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this._socket = null;
    this.socket;

    this.onmessage = null;
  }

  get socket() {
    if (!this._socket) {
      this._socket = new Promise((resolve, reject) => {
        const socket = new WebSocket(this.url);

        socket.addEventListener("open", (event) => {
          // console.log("WebSocket is open");
          resolve(socket);
        });

        socket.addEventListener("message", (event) => {
          // console.log(`Received message: ${event.data}`);
          if (this.onmessage) {
            this.onmessage(event.data);
          }
        });

        socket.addEventListener("close", (event) => {
          // console.log("WebSocket is closed");
          this._socket = null;
          reject();
          console.error(event);
        });

        socket.addEventListener("error", (event) => {
          this._socket = null;
          reject();
          console.error(event);
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

export class Connecter {
  constructor() {
    const pc = (this._pc = new RTCPeerConnection());

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
          this.onmessage(e.data);
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

export class RTCAgent {
  constructor(userData) {
    this.userName = userData.userName;
    this.id = userData.id;
    this.publicKey = userData.publicKey;
    this._users = [];
    this._initWS().then(() => this._initRTC());
  }

  _initWS() {
    return new Promise((resolve) => {
      this._client = new WebSocketClient("ws://localhost:3900");

      this._client.send({
        action: "init",
        userName: this.userName,
        id: this.id,
      });

      this._client.onmessage = (e) => {
        const { action, data, from } = JSON.parse(e);

        switch (action) {
          case "push-users":
            this._users = data;
            resolve();
            break;
          case "switch":
            this._onswitch({ data, from });
            break;
        }
      };
    });
  }

  async _initRTC() {
    const connector = new Connecter();

    window.connector = connector;

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
