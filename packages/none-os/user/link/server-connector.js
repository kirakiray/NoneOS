import { ClientUser } from "./client-user.js";
import { getSelfUserCardData } from "../main.js";
import { serverList, clients } from "./public.js";

// 和服务器进行相连的实例
export class ServerConnector {
  #serverUrl = null;
  #status = "disconnected";
  #apiID;
  #serverID;
  constructor(serverUrl) {
    this.#serverUrl = serverUrl;
    this.init();
  }

  // 连接服务器的初始化操作
  async init() {
    const selfCardData = await getSelfUserCardData();

    // 创建一个 EventSource 对象，连接到 SSE 端点
    const eventSource = (this.__sse = new EventSource(
      `${this.#serverUrl}/${encodeURIComponent(JSON.stringify(selfCardData))}`
    ));

    // 监听消息事件
    eventSource.onmessage = async (event) => {
      const result = JSON.parse(event.data);

      this._ontake && this._ontake(result);

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
            let targetUserClient = clients.get(result.fromUserID);

            if (!targetUserClient) {
              targetUserClient = new ClientUser(
                result.fromUser.data,
                result.fromUser.sign
              );

              if (targetUserClient.id === result.fromUserID) {
                clients.set(result.fromUserID, targetUserClient);
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
      console.error("Server Error occurred:", e);
      // 在这里处理错误
      eventSource.close();

      this._emitchange("closed");
    };

    // 监听连接关闭事件
    eventSource.onclose = () => {
      console.log("Server Connection closed", this);

      this._emitchange("closed");
    };
  }

  // 改变状态
  _emitchange(status) {
    this.#status = status;
    this.onchange && this.onchange();

    if (status === "closed") {
      this.onclose && this.onclose();
    }
  }

  // 提交数据
  async _post(data) {
    const postUrl = new URL(this.#serverUrl).origin + this.#apiID;

    return fetch(postUrl, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // 获取推荐用户
  async getRecommend() {
    debugger;
  }

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

// 已有的服务器
export const connectors = serverList.map((e) => {
  return new ServerConnector(e);
});
