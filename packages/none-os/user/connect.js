import { getUserCardData } from "./main.js";
import { verifyMessage } from "./util.js";

// 可访问服务器列表
const serverList = ["http://localhost:5569/user"];

// class Connector extends EventTarget {
class Connector {
  #status = "disconnected";
  #serverUrl;
  onchangestatus = null;
  #id = Math.random().toString(32).slice(2);
  constructor(serverUrl) {
    // super();
    this.#serverUrl = serverUrl;
  }

  // 进行连接
  async connect() {
    const body = await getUserCardData();

    this.#status = "connecting";

    try {
      const data = await fetch(this.#serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify(body),
      }).then((e) => {
        return e.json();
      });

      console.log("data", data);

      this.initsse(data.sse);

      this.serverName = data.serverName;
      this.serverVersion = data.serverVersion;

      if (this.onchange) {
        this.onchange();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async initsse(sseLink) {
    // 创建一个 EventSource 对象，连接到 SSE 端点
    const eventSource = (this.__sse = new EventSource(
      new URL(this.serverUrl).origin + sseLink
    ));

    // 监听消息事件
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);
    };

    // 监听错误事件
    eventSource.onerror = (error) => {
      console.error("Error occurred:", error);
      // 在这里处理错误
    };

    // 监听连接关闭事件
    eventSource.onclose = () => {
      console.log("Connection closed", this);
      // 在这里处理连接关闭
    };
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
