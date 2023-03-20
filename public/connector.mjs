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
    const pc = (this.pc = new RTCPeerConnection());

    let toUser,
      cacheIces = [];

    pc.addEventListener("icecandidate", (event) => {
      console.log(
        `pc1 ICE candidate: ${
          event.candidate ? event.candidate.candidate : "(null)"
        }`
      );

      if (event.candidate) {
        if (toUser) {
          this.sendById(toUser, {
            type: "exchange-ice",
            ices: [event.candidate],
          });
        } else {
          cacheIces.push(event.candidate);
        }
      }
    });
    const channel = pc.createDataChannel("sendDataChannel");

    channel.onmessage = (e) => {
      console.log("pc1 get message => ", e.data);
    };

    const desc = await pc.createOffer();

    pc.setLocalDescription(desc);

    this._onswitch = ({ data, from }) => {
      switch (data.type) {
        case "exchange-offer":
          toUser = from;
          if (cacheIces.length) {
            this.sendById(toUser, {
              type: "exchange-ice",
              ices: cacheIces,
            });
          }
          break;
        case "exchange-ice":
          const { ices } = data;

          console.log("ices => ", ices);
        // pc2.setRemoteDescription(desc);
      }
      console.log("data => ", from, data);
    };

    if (this._users?.length) {
      const targetUser = this._users[0];

      this.sendById(targetUser.id, {
        type: "exchange-offer",
        desc,
      });

      // 有用户的情况下才进行交换
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
