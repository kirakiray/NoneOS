import { getUserCardData } from "./main.js";
import { verifyMessage } from "./util.js";

// 可访问服务器列表
const serverList = ["http://localhost:5569/user"];

// class Connector extends EventTarget {
class Connector {
  #status = "disconnected";
  #serverUrl;
  onchange = null;
  #id = Math.random().toString(32).slice(2);
  constructor(serverUrl) {
    // super();
    this.#serverUrl = serverUrl;
  }

  // 进行连接
  async connect() {
    this.#status = "connecting";
    this.onchange && this.onchange();

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

      if (data.__type === "init") {
        this.#status = "connected";
        this.serverName = data.serverName;
        this.serverVersion = data.serverVersion;
        this.onchange && this.onchange();
        return;
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

      this.#status = "closed";
      this.onchange && this.onchange();
    };

    // 监听连接关闭事件
    eventSource.onclose = () => {
      console.log("Connection closed", this);

      this.#status = "closed";
      this.onchange && this.onchange();
    };

    // try {
    //   const data = await fetch(this.#serverUrl, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json;charset=utf-8",
    //     },
    //     body: JSON.stringify(body),
    //   }).then((e) => {
    //     return e.json();
    //   });

    //   console.log("data", data);

    //   this.serverName = data.serverName;
    //   this.serverVersion = data.serverVersion;

    //   this.initsse(data.sse);
    // } catch (err) {
    //   console.error(err);
    // }
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
