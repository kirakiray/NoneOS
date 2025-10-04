import { createSingleData } from "../hybird-data/single-data.js";
import { User } from "./user.js";
import { HandServerClient } from "./server/hand.js";

const infos = {};
const servers = {};

export class LocalUser extends User {
  #dirHandle;
  #sessionId;
  #serverConnects = {};
  constructor(handle) {
    super(handle);
    this.#dirHandle = handle;
    this.#sessionId = Math.random().toString(36).slice(2);
  }

  // 获取会话ID
  get sessionId() {
    return this.#sessionId;
  }

  // 获取用户信息对象
  async info() {
    if (infos[this.#dirHandle.path]) {
      return infos[this.#dirHandle.path];
    }

    const infoHandle = await this.#dirHandle.get("info.json", {
      create: "file",
    });

    const infoData = await createSingleData({
      handle: infoHandle,
      disconnect: false,
    });

    // 如果没有默认信息，则添加默认信息
    if (!infoData.name) {
      infoData.name = `User-${Math.random().toString(36).slice(2, 6)}`;
    }

    infos[this.#dirHandle.path] = infoData;

    return infoData;
  }

  // 生成带上用户签名的卡片
  async createCard() {
    const info = await this.info();

    const card = {
      name: info.name,
      userId: this.userId,
    };

    const signedData = await this.sign(card);

    return signedData;
  }

  // 用户的握手服务器列表
  async servers() {
    if (servers[this.#dirHandle.path]) {
      return servers[this.#dirHandle.path];
    }

    const serversHandle = await this.#dirHandle.get("servers.json", {
      create: "file",
    });

    const serversData = await createSingleData({
      handle: serversHandle,
      disconnect: false,
    });

    if (!serversData.length) {
      // 如果没有，则添加默认的服务器
      serversData.push({
        url: "ws://localhost:18290",
        disconnect: false,
      });
    }

    servers[this.#dirHandle.path] = serversData;

    return serversData;
  }

  // 连接服务器
  async connectServer(url) {
    if (this.#serverConnects[url]) {
      return this.#serverConnects[url];
    }
    const serverClient = new HandServerClient({
      url,
      user: this,
    });

    await serverClient.init();

    this.#serverConnects[url] = serverClient;

    return serverClient;
  }
}
