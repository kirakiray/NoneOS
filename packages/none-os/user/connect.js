import { getUserCardData } from "./main.js";
import { ClientUser } from "./client-user.js";
import { saveUser } from "./usercard.js";

// 可访问服务器列表
const serverList = ["http://localhost:5569/user"];

// class Connector extends EventTarget {
class Connector {
  #status = "disconnected";
  #serverUrl;
  #serverID;
  #apiID;
  onchange = null;
  onclose = null;
  users = [];
  clients = new Map();
  constructor(serverUrl) {
    // super();
    this.#serverUrl = serverUrl;
  }

  get apiID() {
    return this.#apiID;
  }

  // 提交并查找用户，成功的话返回用户实例
  async checkUser(userID) {
    const exitedUser = this.clients.get(userID);

    if (exitedUser) {
      return exitedUser;
    }

    const result = await fetch(
      `${new URL(this.serverUrl).origin}${this.#apiID}`,
      {
        method: "POST",
        body: JSON.stringify({
          getUser: {
            userID,
          },
        }),
      }
    ).then((e) => e.json());

    if (!result.error) {
      // 查找到用户
      const cUser = new ClientUser(result.data.user, result.data.sign);

      if (cUser.id === userID && (await cUser.verify())) {
        const { host } = new URL(this.#serverUrl);

        // 实时更新
        await saveUser({
          source: host,
          data: cUser.data,
          dataSignature: cUser.dataSignature,
        });

        await cUser.init(this);

        this.clients.set(cUser.id, cUser);

        return cUser;
      }
    }
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
            this.#serverID = result.serverID;
            this.#apiID = result.apiID;

            this._emitchange("connected");
            break;

          case "agent-connect":
            // 用户之间尝试进行握手操作
            let targetUserClient = this.clients.get(result.fromUserID);

            if (!targetUserClient) {
              targetUserClient = new ClientUser(
                result.fromUser.data,
                result.fromUser.sign
              );

              await targetUserClient.init(this);

              if (targetUserClient.id === result.fromUserID) {
                this.clients.set(result.fromUserID, targetUserClient);
              }
            }

            // 初始化 connect
            targetUserClient._agentConnect(result.data);

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

  get serverID() {
    return this.#serverID;
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
