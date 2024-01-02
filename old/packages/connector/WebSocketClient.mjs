export default class WebSocketClient extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
    this._socket = null;
    this.socket;
    this.users = [];
    this.connectors = [];
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
        });

        socket.addEventListener("error", (event) => {
          this._socket = null;
          reject();
          this.dispatchEvent(new Event("close", event));
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

  sendById(id, data) {
    this.send({
      action: "switch",
      to: id,
      data,
    });
  }
}
