export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this._socket = null;
    this.socket;
  }

  get socket() {
    if (!this._socket) {
      this._socket = new Promise((resolve, reject) => {
        const socket = new WebSocket(this.url);

        socket.addEventListener("open", (event) => {
          console.log("WebSocket is open");
          resolve(socket);
        });

        socket.addEventListener("message", (event) => {
          console.log(`Received message: ${event.data}`);
        });

        socket.addEventListener("close", (event) => {
          console.log("WebSocket is closed");
          this._socket = null;
          reject();
        });

        socket.addEventListener("error", (event) => {
          this._socket = null;
          console.error("WebSocket error occurred");
        });
      });
    }

    return this._socket;
  }

  async send(message) {
    (await this.socket).send(message);
  }

  async close() {
    (await this.socket).close();
  }
}
