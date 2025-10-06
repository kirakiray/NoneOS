import { BaseUser } from "./base-user.js";
import { getHash } from "../fs/util.js";

export class RemoteUser extends BaseUser {
  #serverState = 0; // 连接状态 0: 未连接 1: 已连接
  #rtcState = 0; // 连接状态 0: 未连接 1: 已连接
  #mode = 0; // 连接模式 0: 未连接 1: 服务端转发模式 2: 点对点模式 3: 同时模式
  #self; // 和本机绑定的用户
  #servers = []; // 可用的服务器列表，按访问对方的速度排序
  constructor(publicKey, self) {
    super(publicKey);
    this.#self = self;
  }

  get serverState() {
    return this.#serverState;
  }

  get rtcState() {
    return this.#rtcState;
  }

  get mode() {
    return this.#mode;
  }

  async checkState() {
    const serversData = await this.#self.servers();

    const servers = [];

    // 等待最快的服务器初始化完成
    // const fastestServer = await Promise.any(
    await Promise.any(
      serversData.map(async (server) => {
        const serverClient = await this.#self.connectServer(server.url);

        const userData = await serverClient.findUser(this.userId);

        if (userData.isOnline && userData.publicKey) {
          // 判断publicKey是否伪造
          const publicKeyHash = await getHash(userData.publicKey);

          if (publicKeyHash !== this.userId) {
            // 伪造的publicKey，直接等待到最后
            throw new Error("publicKey伪造");
          }

          // 可用服务器按照延迟顺序排序
          servers.push(serverClient);

          return userData;
        }

        throw new Error("用户不在线");
      })
    );

    // 更新可用服务器列表
    this.#servers = servers;

    if (this.#mode === 0) {
      // 更新连接状态
      this.#serverState = 1;
      this.#mode = 1;
    } else {
      debugger;
    }
  }

  // 发送消息
  send(msg) {
    if (this.#serverState === 0) {
      throw new Error("未连接到对方");
    }
  }
}
