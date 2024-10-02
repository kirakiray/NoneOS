import { users, ClientUser } from "./user.js";
import { getSelfUserCardData, sign } from "../user/main.js";
import { get } from "../fs/handle/index.js";

export const servers = $.stanz([]); // 当前存在的服务器

const serverFile = await get("local/system/servers", { create: "file" });

servers.watchTick(async () => {
  const datas = servers.map((e) => {
    return {
      serverName: e.serverName,
      serverUrl: e.serverUrl,
    };
  });

  // 内容不一致就保存
  const text = await serverFile.text();

  if (text !== JSON.stringify(datas)) {
    serverFile.write(JSON.stringify(datas));
  }
}, 300);

// 添加服务器
export const addServer = (serverUrl) => {
  const connector = new ServerConnector({
    serverUrl,
  });

  servers.push(connector);
};

// 删除对应地址的服务器
export const deleteServer = (url) => {
  const id = servers.findIndex((e) => e.serverUrl === url);

  if (id > -1) {
    servers.splice(id, 1);
  }
};

const BADTIME = 999999; // 无延迟的时间值
const sessionID = Math.random().toString(32).slice(2); // 临时id

// 服务器连接器
class ServerConnector extends $.Stanz {
  #apiID; // post请求的接口ID
  #initingPms = null; // 初始化的 promise 对象
  constructor(data) {
    super({
      serverName: "",
      serverUrl: "", // 服务器地址
      status: "", // 当前服务器的状态
      serverID: "", //  服务器ID
      delayTime: "", // 服务器的延迟时间
      ...data,
    });

    this.init();
  }

  async init() {
    if (this.#initingPms) {
      return await this.#initingPms;
    }

    return (this.#initingPms = new Promise(async (resolve, reject) => {
      const selfCardData = await getSelfUserCardData();

      if (this.__sse) {
        this.__sse.close();
      }

      // const serverSign = await sign(this.serverUrl);
      const serverSign = await sign(new URL(this.serverUrl).origin);

      // 创建一个 EventSource 对象，连接到 SSE 端点
      const eventSource = (this.__sse = new EventSource(
        `${this.serverUrl}/${encodeURIComponent(
          JSON.stringify({
            ...selfCardData,
            sessionID,
            serverSign,
          })
        )}`
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
              this.serverID = result.serverID;
              this.#apiID = result.apiID;

              this.status = "connected";

              this.ping();

              this.#initingPms = null;

              resolve(eventSource);
              break;

            case "agent-connect":
              // 用户之间尝试进行握手操作
              let targetUserClient = users.find(
                (e) => e.id === result.fromUserID
              );

              if (!targetUserClient) {
                targetUserClient = new ClientUser({
                  data: result.fromUser.data,
                  dataSignature: result.fromUser.sign,
                });
              }

              // 初始化 connect
              targetUserClient._agentConnect(result.data);

              break;
            default:
              console.log(result);
              return;
          }
        } else if (this.onmessage) {
          this.onmessage(result);
        }
      };

      // 监听错误事件
      eventSource.onerror = (e) => {
        this.#initingPms = null;
        reject();

        console.error(e);
        // 在这里处理错误
        eventSource.close();

        this.delayTime = BADTIME;

        this.status = "closed";
      };

      // 监听连接关闭事件
      eventSource.onclose = () => {
        this.#initingPms = null;
        reject();

        console.log("Server Connection closed", this);
        this.delayTime = BADTIME;

        this.status = "closed";
      };
    }));
  }

  // 提交数据
  async _post(data) {
    if (this.status === "closed") {
      await this.init();
    }

    const postUrl = new URL(this.serverUrl).origin + this.#apiID;

    return fetch(postUrl, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // 测试延迟
  async ping() {
    return new Promise((resolve) => {
      setTimeout(async () => {
        // 延迟测试更准确
        const startTime = Date.now();
        const result = await this._post({
          ping: Date.now(),
        }).then((e) => e.json());

        if (result.pong) {
          this.delayTime = Date.now() - startTime;
        }

        resolve(this.delayTime);
      }, 50);
    });
  }

  // 获取推荐用户
  async getRecommend() {
    const result = await this._post({
      recommends: 1,
    }).then((e) => e.json());

    if (result.ok) {
      return result.data;
    }
  }
}

{
  // 读取缓存的数据
  let data = await serverFile.text();
  try {
    if (data) {
      data = JSON.parse(data);

      data.forEach((e) => {
        servers.push(
          new ServerConnector({
            serverUrl: e.serverUrl,
            serverName: e.serverName,
          })
        );
      });
    }
  } catch (err) {
    console.error(err);
  }

  if (!servers.length && location.host.includes("localhost")) {
    // 添加测试服务器
    addServer("http://localhost:5569/user");
  }
}
