import { getUserCardData } from "./main.js";
import { verifyMessage } from "./util.js";

// 可访问服务器列表
const serverList = ["http://localhost:5569/user"];

// class Connector extends EventTarget {
class Connector {
  #status = "disconnected";
  #serverUrl;
  onchange = null;
  onclose = null;
  users = [];
  #id = Math.random().toString(32).slice(2);
  constructor(serverUrl) {
    // super();
    this.#serverUrl = serverUrl;
  }

  // 进行连接
  async connect() {
    this._emitchange("connecting");

    if (this.__sse) {
      this.__sse.close();
    }

    const body = await getUserCardData();

    // 创建一个 EventSource 对象，连接到 SSE 端点
    const eventSource = (this.__sse = new EventSource(
      `${this.serverUrl}/${encodeURIComponent(JSON.stringify(body))}`
    ));

    // 监听消息事件
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.__type) {
        switch (data.__type) {
          case "init":
            this.serverName = data.serverName;
            this.serverVersion = data.serverVersion;

            this._emitchange("connected");
            break;
          case "update-user":
            this.users = data.users.map((e) => {
              return {
                userName: e.data.find((e) => e[0] === "userName")[1],
                userID: e.data.find((e) => e[0] === "userID")[1],
              };
            });
            this.onupdate && this.onupdate();
            break;

          default:
            console.log(data);
            return;
        }
      }

      if (this.onmessage) {
        this.onmessage(data);
      }
    };

    // 监听错误事件
    eventSource.onerror = (e) => {
      console.error("Error occurred:", e);
      // 在这里处理错误
      eventSource.close();

      this._emitchange("closed");
    };

    // 监听连接关闭事件
    eventSource.onclose = () => {
      console.log("Connection closed", this);

      this._emitchange("closed");
    };
  }

  _emitchange(status) {
    this.#status = status;
    this.onchange && this.onchange();

    if (status === "closed") {
      this.onclose && this.onclose();
    }
  }

  // 关闭链接
  close() {}

  get status() {
    return this.#status;
  }

  get serverUrl() {
    return this.#serverUrl;
  }

  get id() {
    return this.#id;
  }
}
const servers = serverList.map((url) => {
  return new Connector(url);
});

export const addServer = (url) => {
  const server = new Connector(url);
  servers.push(server);
  return server;
};

export const getServers = () => {
  return [...servers];
};
