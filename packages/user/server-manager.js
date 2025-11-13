import { createSingleData } from "../hybird-data/single-data.js";

export class ServerManager {
  #self;
  #data;
  #dirHandle;
  constructor(user, dirHandle) {
    this.#self = user;
    this.#dirHandle = dirHandle;
  }

  async init() {
    const serversHandle = await this.#dirHandle.get("servers.json", {
      create: "file",
    });

    const serversData = await createSingleData({
      handle: serversHandle,
      disconnect: false,
    });

    this.#data = serversData;

    if (!serversData.length) {
      await this.reset();
    }
  }

  get data() {
    return this.#data;
  }

  // 重置所有服务器
  async reset() {
    this.#data.splice(0, this.#data.length); // 先清空

    if (location.host === "localhost:5559") {
      // 如果没有，则添加默认的服务器
      this.#data.push({
        url: "ws://localhost:18290",
      });
      this.#data.push({
        url: "ws://localhost:18291",
      });
    } else {
      // 添加在线版服务器
      this.#data.push(
        {
          url: "wss://hand-us1.noneos.com",
        },
        {
          url: "wss://hand-jp1.noneos.com",
        }
      );
    }
  }
}
