// 本地用户相关的类
import { createSingleData } from "../hybird-data/single-data.js";
import { BaseUser } from "./base-user.js";
import { HandServerClient } from "./hand/client.js";
import { getHash } from "../fs/util.js";
import { RemoteUser } from "./remote-user.js";
import internal from "./internal/index.js";
import CertManager from "./cert-manager.js";
import { generate } from "../util/rand-adj-noun.js";
import { ServerManager } from "./server-manager.js";
import { CardManager } from "./card-manager.js";
import { publicBroadcastChannel } from "./util/public-channel.js";

// 本地用户类
export class LocalUser extends BaseUser {
  #dirHandle;
  #sessionId;
  #serverConnects = {};
  #remotes = {};
  #certManager = null;
  #serverManager = null;
  #cardManager = null;

  #myDeviceCache = {};
  #info = null;
  #registers = {};

  constructor(handle) {
    super(handle);
    this.#dirHandle = handle;
    this.#sessionId = Math.random().toString(36).slice(2);

    const msgIdCaches = new Set();

    // 定时清除msgIdCaches
    setInterval(() => {
      msgIdCaches.clear();
    }, 1000 * 30);

    // 接受到服务端转发过来的数据
    this.bind("received-server-agent-data", async (event) => {
      const options = event.detail.response;
      let { fromUserId, fromUserSessionId, data: originData } = options;
      const { server } = event.detail;

      if (!originData) {
        return;
      }

      // 还原数据
      if (originData.msgId) {
        // 防止和rtc数据接收重复
        if (msgIdCaches.has(originData.msgId)) {
          return;
        }

        msgIdCaches.add(originData.msgId);
      }

      const data = originData.msg;

      if (data.__internal_mark) {
        // 内部操作
        if (internal[data.type]) {
          internal[data.type]({
            fromUserId,
            fromUserSessionId,
            data,
            server,
            localUser: this,
          });
        } else {
          console.warn(`未实现的内部操作类型: ${data.type}`, data);
        }
        return;
      }

      // 触发接收数据事件
      this.dispatchEvent(
        new CustomEvent("receive-data", {
          detail: {
            fromUserId,
            fromUserSessionId,
            data,
            server,
            options,
          },
        })
      );
    });

    this.bind("rtc-message", (event) => {
      let {
        remoteUser,
        result: message,
        channel,
        rtcConnection,
        proxySessionId,
      } = event.detail;

      let publicDetail = {};

      if (proxySessionId) {
        publicDetail = {
          fromUserId: event.detail.fromUserId,
          fromUserSessionId: event.detail.fromUserSessionId,
        };
      } else {
        publicDetail = {
          fromUserId: remoteUser.userId,
          fromUserSessionId: rtcConnection.__oppositeUserSessionId,
        };
      }

      if (message.msgId) {
        // 防止和服务端转发重复
        if (msgIdCaches.has(message.msgId)) {
          return;
        }

        msgIdCaches.add(message.msgId);
      }

      if (message.userSessionId && message.userSessionId !== this.sessionId) {
        if (proxySessionId) {
          // 已经在其他session中处理了，直接返回
          return;
        }

        // 转发到指定的session标签页，并且不是当前session
        publicBroadcastChannel.postMessage({
          type: "rtc-agent-message",
          detail: {
            ...publicDetail,
            result: message,
            proxySessionId: this.sessionId,
            toUserSessionId: message.userSessionId,
            userDirName: this.dirName,
          },
        });
        return;
      }

      const data = message.msg;

      if (data.__internal_mark) {
        // 内部操作
        if (internal[data.type]) {
          internal[data.type]({
            fromUserId: remoteUser.userId,
            fromUserSessionId: !rtcConnection
              ? event.detail.fromUserSessionId
              : rtcConnection.__oppositeUserSessionId,
            data,
            channel,
            localUser: this,
          });
        } else {
          console.warn(`未实现的内部操作类型: ${data.type}`, data);
        }
        return;
      }

      // 触发接收数据事件
      this.dispatchEvent(
        new CustomEvent("receive-data", {
          detail: {
            ...publicDetail,
            data,
            channel,
            options: { ...message },
          },
        })
      );
    });
  }

  // 获取会话ID
  get sessionId() {
    return this.#sessionId;
  }

  get dirName() {
    return this.#dirHandle.name;
  }

  get registers() {
    return { ...this.#registers };
  }

  get serverConnects() {
    return { ...this.#serverConnects };
  }

  get remotes() {
    return { ...this.#remotes };
  }

  // 注册让远端触发的事件
  register(name, func) {
    const pool = this.#registers[name] || (this.#registers[name] = new Set());
    pool.add(func);

    return () => {
      pool.delete(func);
    };
  }

  // 广播信息给所有设备
  async broadcast(name, data) {
    // 先获取所有的设备卡片
    const myDevices = await this.myDevices();

    // 连接所有设备并发送数据
    // 并行连接所有设备并触发事件
    Promise.all(
      myDevices.map(async (device) => {
        const remoteUser = await this.connectUser(device.userId);
        remoteUser.trigger(name, data).catch(() => null); // 忽略连接失败的错误
      })
    );
  }

  // 获取用户信息对象
  async info() {
    if (this.#info) {
      return this.#info;
    }

    return (this.#info = (async () => {
      const infoHandle = await this.#dirHandle.get("info.json", {
        create: "file",
      });

      const infoData = await createSingleData({
        handle: infoHandle,
        disconnect: false,
      });

      // 如果没有默认信息，则添加默认信息
      if (!infoData.name) {
        infoData.name = generate();
      }

      return infoData;
    })());
  }

  // 生成带上用户签名的卡片
  async createCard(options) {
    const info = await this.info();

    const card = {
      ...options,
      name: info.name,
      userId: this.userId,
    };

    const signedData = await this.sign(card);

    return signedData;
  }

  // 连接服务器
  async connectServer(url, options = {}) {
    if (this.#serverConnects[url]) {
      return this.#serverConnects[url];
    }

    options = { ...options };

    if (options.waitForAuthed === undefined) {
      options.waitForAuthed = true;
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

    return (this.#serverConnects[url] = (async () => {
      await serverClient.init();

      if (this.state !== "authed") {
        if (options.waitForAuthed) {
          await new Promise((resolve, reject) => {
            const cleanup = (reason) => {
              clearTimeout(timeout);
              offBind();
              serverClient.disconnect();
              resolve();
              console.error("连接服务器超时", reason);
            };

            // 超时
            const timeout = setTimeout(() => cleanup("连接服务器超时"), 8000);

            const offBind = serverClient.bind("change-state", () => {
              if (serverClient.state === "authed") {
                clearTimeout(timeout);
                offBind();
                resolve();
              } else if (serverClient.state === "closed") {
                // 发生关闭事件
                cleanup("服务器关闭");
              }
            });
          });
        }
      }

      return serverClient;
    })());
  }

  async connectAllServers(name = "any") {
    const serverManager = await this.serverManager();

    // name只允许指定的名字
    if (name !== "any" && name !== "all" && name !== "race") {
      throw new Error("name只允许指定为'any'、'all'或'race'");
    }

    await Promise[name](
      serverManager.data.map(async (server) => {
        await this.connectServer(server.url);
      })
    );
  }

  // 直接连接用户
  async connectUser(options = {}) {
    if (typeof options === "string") {
      options = { userId: options };
    }

    if (options.userId) {
      const { userId } = options;

      let publicKey = options.publicKey;
      if (publicKey && (await getHash(publicKey)) !== userId) {
        throw new Error("传入的publicKey是伪造的");
      }

      if (this.#remotes[userId]) {
        return this.#remotes[userId];
      }

      return (this.#remotes[userId] = (async () => {
        // 优先从本地卡片库查找用户
        const cardManager = await this.cardManager();

        const card = await cardManager.get(userId);

        if (card) {
          publicKey = card.publicKey;
        }

        if (!publicKey) {
          const serverManager = await this.serverManager();

          // 从在线服务器上查找用户卡片
          const userData = await Promise.any(
            serverManager.data.map(async (server) => {
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

              throw new Error("没有 publicKey");
            })
          ).catch(() => null);

          if (!userData) {
            throw new Error("未能在任何在线服务器上找到该用户，连接失败");
          }

          publicKey = userData.publicKey;
        }

        const user = new RemoteUser(publicKey, this);

        // 初始化基础类的逻辑
        await user.init();

        // 检查通信状态
        await user.checkServer();

        // user.refreshMode();

        return user;
      })());
    }
  }

  // 获取卡片管理器
  async cardManager() {
    if (this.#cardManager) {
      return this.#cardManager;
    }

    return (this.#cardManager = (async () => {
      const cardManager = new CardManager(this);
      await cardManager.init();
      return cardManager;
    })());
  }

  // 获取服务器管理器
  async serverManager() {
    if (this.#serverManager) {
      return this.#serverManager;
    }

    return (this.#serverManager = (async () => {
      const serverManager = new ServerManager(this, this.#dirHandle);
      await serverManager.init();
      return serverManager;
    })());
  }

  // 获取证书管理器
  async certManager() {
    if (this.#certManager) {
      return this.#certManager;
    }

    return (this.#certManager = (async () => {
      const certManager = new CertManager(this);
      await certManager.initDB();
      return certManager;
    })());
  }

  // 判断对方id是否是我的设备
  async isMyDevice(deviceId) {
    // 先从缓存中查找
    if (this.#myDeviceCache[deviceId] !== undefined) {
      return this.#myDeviceCache[deviceId];
    }

    return (this.#myDeviceCache[deviceId] = (async () => {
      const certManager = await this.certManager();
      const certs = await certManager.get({
        role: "device",
        issuedTo: deviceId,
      });

      setTimeout(() => {
        // 结果只缓存5秒，5秒后删除缓存
        delete this.#myDeviceCache[deviceId];
      }, 1000 * 5);

      return !!certs.length;
    })());
  }

  // 获取我的所有设备
  async myDevices() {
    const certManager = await this.certManager();
    const users = [];
    const cardManager = await this.cardManager();

    const certs = await certManager.get("device");
    const giveMeCerts = await certManager.query({
      role: "device",
      issuedTo: this.userId,
    });

    for (let cert of certs) {
      const found = giveMeCerts.find((item) => item.issuedBy === cert.issuedTo);

      if (!found) {
        // 我给了对方，但对方没给我授权，就不是我的设备了
        continue;
      }

      const userCard = await cardManager.get(cert.issuedTo);

      if (userCard) {
        users.push({
          userId: cert.issuedTo,
          userCard,
        });
      } else {
        users.push({
          userId: cert.issuedTo,
        });
      }
    }

    return users;
  }
}
