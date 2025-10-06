// 本地用户相关的类
import { createSingleData } from "../hybird-data/single-data.js";
import { BaseUser } from "./base-user.js";
import { HandServerClient } from "./hand/client.js";
import { getHash } from "../fs/util.js";
import { RemoteUser } from "./remote-user.js";

const infos = {};
const servers = {};

// 本地用户类
export class LocalUser extends BaseUser {
  #dirHandle;
  #sessionId;
  #serverConnects = {};
  #remotes = {};
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

  // 用户保存的握手服务器列表
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

    servers[this.#dirHandle.path] = serversData;

    return serversData;
  }

  // 连接服务器
  async connectServer(url, options = {}) {
    if (this.#serverConnects[url]) {
      return this.#serverConnects[url];
    }

    let serverClient = null;

    if (options.admin && options.password) {
      // 管理员模式
      const { AdminHandServerClient } = await import("./hand/admin-client.js");

      serverClient = new AdminHandServerClient({
        url,
        user: this,
        password: options.password,
      });
    } else {
      serverClient = new HandServerClient({
        url,
        user: this,
      });
    }

    serverClient.addEventListener("agent-data", (e) => {
      const { fromUserId, data } = e.detail;
      debugger;
    });

    return (this.#serverConnects[url] = (async () => {
      await serverClient.init();

      await new Promise((resolve) => {
        const authHandle = (e) => {
          serverClient.removeEventListener("authed", authHandle);
          resolve();
        };
        serverClient.addEventListener("authed", authHandle);
      });

      return serverClient;
    })());
  }

  // 直接连接用户
  async connectUser(options = {}) {
    const serversData = await this.servers();

    if (options.userId) {
      const { userId } = options;

      if (this.#remotes[userId]) {
        return this.#remotes[userId];
      }

      return (this.#remotes[userId] = (async () => {
        // TODO: 先查看是否有用户本地卡片

        // 从在线服务器上查找用户卡片
        const userData = await Promise.any(
          serversData.map(async (server) => {
            const serverClient = await this.connectServer(server.url);

            const userData = await serverClient.findUser(userId);

            if (userData.publicKey) {
              // 判断publicKey是否伪造
              const publicKeyHash = await getHash(userData.publicKey);

              if (publicKeyHash !== userId) {
                throw new Error("publicKey伪造");
              }

              return userData;
            }
          })
        );

        const user = new RemoteUser(userData.publicKey, this);

        // 初始化逻辑
        await user.init();

        // 检查通信状态
        await user.checkState();

        return user;
      })());
    }
  }

  // 获取用户已有的设备数据
  async myDevices() {
    const devicesHandle = await this.#dirHandle.get("devices.json", {
      create: "file",
    });

    const devicesData = await createSingleData({
      handle: devicesHandle,
      disconnect: false,
    });

    return devicesData;
  }
}
