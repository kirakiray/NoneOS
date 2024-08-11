import { getUserCardData } from "./main.js";
import { ClientUser } from "./client-user.js";

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
    eventSource.onmessage = async (event) => {
      const result = JSON.parse(event.data);

      if (result.__type) {
        switch (result.__type) {
          case "init":
            // 初始化用户和服务器信息
            this.serverName = result.serverName;
            this.serverVersion = result.serverVersion;
            this.apiID = result.apiID;

            this._emitchange("connected");
            break;
          case "update-user":
            // 代理服务器中用户数量信息发生了变化
            const users = [];

            await Promise.all(
              result.users.map(async (e) => {
                const user = new ClientUser(e.data, e.sign);

                const result = await user.verify();

                if (result) {
                  // 初始化完成后添加到队列
                  await user.init(this);

                  users.push({
                    userName: user.name,
                    userID: user.id,
                    _user: user,
                  });
                } else {
                  console.error("这个服务器带有未验证的用户");
                }
              })
            );

            this.users = users;
            this.onchange && this.onchange();
            break;

          case "connect":
            // 用户之间尝试进行握手操作
            const fromUser = this.users.find(
              (e) => e.userID === result.fromUserID
            );

            if (fromUser) {
              // 初始化 connect
              fromUser._user._agentConnect(result.data);
            }

            break;

          default:
            console.log(result);
            return;
        }
      } else {
        if (this.onmessage) {
          this.onmessage(result);
        }
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
