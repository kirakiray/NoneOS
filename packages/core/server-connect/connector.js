import { getSelfUserCardData, sign } from "/packages/user/main.js";
import { get } from "/packages/fs/handle/index.js";
import { User } from "/packages/user/public-user.js";
import { UserClient } from "../user-connect/user-client.js";
import { users } from "../main.js";

// 存放服务端的目录
const serverCacheDir = (async () => {
  const fileHandle = await get("local/caches/server", {
    create: "dir",
  });

  return fileHandle;
})();

const BADTIME = "-"; // 测不到延迟时间
const sessionID = Math.random().toString(32).slice(2); // 临时id

export class ServerConnector extends $.Stanz {
  #apiID; // post请求的接口ID
  #initingPms = null; // 初始化的 promise 对象
  #sse; //  SSE 对象
  constructor(data) {
    super({
      serverName: "",
      serverUrl: "", // 服务器地址
      status: "", // 当前服务器的状态
      serverID: "", //  服务器ID
      delayTime: BADTIME, // 服务器的延迟时间
      ...data,
    });

    this.init();
  }

  // 初始化
  async init() {
    if (this.#initingPms) {
      return await this.#initingPms;
    }

    const selfCardData = await getSelfUserCardData();

    this.status = "connecting"; // 设置连接中

    return (this.#initingPms = new Promise(async (resolve, reject) => {
      // 让服务器验证是当前用户的验证
      const serverSign = await sign(new URL(this.serverUrl).origin);

      if (this.#sse) {
        this.#sse.close();
      }

      // 创建一个 EventSource 对象，连接到 SSE 端点
      const eventSource = (this.#sse = new EventSource(
        `${this.serverUrl}/${encodeURIComponent(
          JSON.stringify({
            ...selfCardData,
            sessionID,
            serverSign,
          })
        )}`
      ));

      const cacheDir = serverCacheDir.then((dir) => {
        const urlObj = new URL(this.serverUrl);

        // 打印目录名
        const sname =
          urlObj.host.split(":").join("--") +
          urlObj.pathname.split("/").join("--");

        return dir.get(sname, {
          create: "dir",
        });
      });

      eventSource.onmessage = (event) => {
        const result = JSON.parse(event.data);

        // 保存打印的信息
        cacheDir
          .then((dir) => {
            return dir.get(`${Date.now()}.json`, {
              create: "file",
            });
          })
          .then((fileHandle) => {
            return fileHandle.write(JSON.stringify(result));
          });

        // 更新服务器信息
        if (result.__type === "init") {
          this.serverName = result.serverName;
          this.serverVersion = result.serverVersion;
          this.serverID = result.serverID;
          this.#apiID = result.apiID;

          this.status = "connected";

          resolve();

          // 初次测试延迟
          this.ping();
          return;
        }

        this._onServerMsg(result);
      };

      // 监听连接关闭事件
      const closeSource = (eventSource.onclose = () => {
        if (this.#sse === eventSource) {
          this.#initingPms = null;
          reject();
          this.delayTime = BADTIME;
          this.status = "closed";
          console.log("Server Connection closed", this);
        }
      });

      // 监听错误事件
      eventSource.onerror = (e) => {
        console.error(e);
        eventSource.close();
        // 在这里处理错误
        closeSource();
      };
    }));
  }

  // 当服务器推送过来的时候，触发的函数
  async _onServerMsg(result) {
    switch (result.__type) {
      case "agent-connect":
        // 转发用户数据
        const { fromUser, data } = result;

        // 验证数据的正确性
        const client = new User(fromUser.data, fromUser.sign);

        if (await client.verify()) {
          // 查看是否在队列，在队列的话直接转发内容
          let targetClient = users.find((e) => e.userId === client.id);

          if (!targetClient) {
            // TODO: 如果不在用户队列，则需要先添加
            targetClient = new UserClient(fromUser);
            users.push(targetClient);
          }

          targetClient._onServerAgent(data);
        } else {
          // TODO: 验证用户失败，需要调整
          debugger;
        }

        break;
    }
  }

  // 测试延迟
  async ping() {
    if (this._pinging) {
      return this._pinging;
    }

    this.delayTime = BADTIME;
    return (this._pinging = new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // 延迟测试更准确
          const startTime = Date.now();
          const result = await this._post({
            ping: Date.now(),
          }).then((e) => e.json());

          if (result.pong) {
            this.delayTime = Date.now() - startTime;
          }

          this._pinging = null;
          resolve(this.delayTime);
        } catch (err) {
          this._pinging = null;
          reject(err);
        }
      }, 50);
    }));
  }

  get serverPostUrl() {
    return new URL(this.serverUrl).origin + this.#apiID;
  }

  // 给服务器发送数据
  async _post(data) {
    if (!this.#initingPms) {
      await this.init();
    }

    await this.#initingPms;

    return fetch(this.serverPostUrl, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}
