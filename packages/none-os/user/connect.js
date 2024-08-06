// 可访问服务器列表
const serverList = ["http://localhost:5569/"];

class Connector extends EventTarget {
  #status = "disconnected";
  #serverUrl;
  #id = Math.random().toString(32).slice(2);
  constructor(serverUrl) {
    super();
    this.#serverUrl = serverUrl;
  }

  // 进行连接
  connect() {
    debugger;
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

export const servers = serverList.map((url) => {
  return new Connector(url);
});

export const addServer = (url) => {
  const server = new Connector(url);
  servers.push(server);
  return server;
};
