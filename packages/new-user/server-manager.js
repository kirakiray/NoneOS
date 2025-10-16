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

    if (!serversData.length) {
      if (location.host === "localhost:5559") {
        // 如果没有，则添加默认的服务器
        serversData.push({
          url: "ws://localhost:18290",
        });
      } else {
        // 添加在线版服务器
        serversData.push(
          {
            url: "wss://hand-us1.noneos.com",
          },
          {
            url: "wss://hand-jp1.noneos.com",
          }
        );
      }
    }

    this.#data = serversData;
  }

  get data() {
    return this.#data;
  }
}
