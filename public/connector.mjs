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
    this.publicKey = userData.publicKey;
    this._initWS();
    this._initRTC();
  }

  async _initWS() {
    this._client = new WebSocketClient("ws://localhost:3900");

    this._client.onmessage = (data) => {
      console.log("data => ", data);
    };
  }

  async _initRTC() {
    const pc = (this.pc = new RTCPeerConnection());

    pc.addEventListener("icecandidate", (event) => {
      console.log(
        `pc1 ICE candidate: ${
          event.candidate ? event.candidate.candidate : "(null)"
        }`
      );

      // this._client.send({
      //   action: "switch-ice",
      //   candidate: event.candidate,
      // });
    });

    const channel = pc.createDataChannel("sendDataChannel");

    channel.onmessage = (e) => {
      console.log("pc1 get message => ", e.data);
    };

    const desc = await pc.createOffer();

    this._client.send({
      action: "init",
      userName: this.userName,
      desc,
    });

    console.log("desc => ", desc);
  }
}
