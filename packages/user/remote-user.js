import { BaseUser } from "./base-user.js";
import { getHash } from "../fs/util.js";
import initRTC from "./remote/init-rtc.js";
import { toBuffer } from "./util/buffer-data.js";
import { objectToUint8Array, uint8ArrayToObject } from "./util/msg-pack.js";

export class RemoteUser extends BaseUser {
  #mode = 0; // 连接模式 0: 未连接 1: 服务端转发模式 2: 点对点模式 3: 同时模式
  #self; // 和本机绑定的用户
  #servers = []; // 可用的服务器列表，按访问对方的速度排序
  _rtcConnections = []; // RTC连接实例

  constructor(publicKey, self) {
    super(publicKey);
    this.#self = self;
  }

  // 是否可通过服务端转发到对方
  get serverState() {
    return this.#servers.length ? 1 : 0;
  }

  // 是否可通过点对点连接到对方
  get rtcState() {
    return this._rtcConnections.some(
      (conn) => conn.connectionState === "connected"
    )
      ? 1
      : 0;
  }

  get self() {
    return this.#self;
  }

  get servers() {
    return [...this.#servers];
  }

  get mode() {
    return this.#mode;
  }

  // 检查连接状态
  async repairState() {
    // 先判断是否有rtc通道可用
    if (this._rtcConnections.length) {
      const hasConnected = this._rtcConnections.some((conn) => {
        if (conn.connectionState === "connected") {
          return conn._dataChannels.some(
            (channel) => channel.readyState === "open"
          );
        }

        return false;
      });

      if (hasConnected) {
        // 如果有已连接的rtc通道，则更新连接状态
        this._changeMode(2);
        return;
      }
    }

    if (this.#servers.length && this.#mode === 0) {
      // 如果之前是不可用的，则更新连接状态
      this._changeMode(1);
      return;
    }

    this._changeMode(0);
  }

  _changeMode(mode) {
    this.#mode = mode;
    this.dispatchEvent(new CustomEvent("mode-change", { detail: mode }));
  }

  async checkServer() {
    const serverManager = await this.#self.serverManager();
    const servers = [];

    // 等待最快的服务器初始化完成
    try {
      await Promise.any(
        serverManager.data.map(async (server) => {
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
    } catch (aggregateError) {
      // 所有服务器都失败，这里可以记录日志或做其他处理
      // 例如：console.warn("所有服务器尝试失败", aggregateError.errors);
      // console.warn("所有服务器尝试失败", aggregateError.errors);
      console.log(`搜索设备${this.userId}失败`);
    }

    // 更新可用服务器列表
    this.#servers = servers;

    this.repairState();
  }

  // 更新连接模式
  // 如果用户已经server状态，则可以切换到rtc模式
  async refreshMode() {
    // 确认对方在线，判断并进行rtc连接
    if (this.mode === 1) {
      const bool = await this.#self.isMyDevice(this.userId);

      if (bool) {
        this.initRTC();
      }
    }
  }

  // 初始化RTC连接
  initRTC(options) {
    if (this._rtc_pairing) {
      // 如果正在配对中，则直接返回
      return this._rtc_pairing;
    }

    if (this.#mode === 2) {
      return;
    }

    this._runInitRTC = 1; // 标记是否已运行过initRTC

    if (this.serverState === 0) {
      throw new Error("未找到合适的握手服务器");
    }

    // 初始化RTC连接
    initRTC(this, options);

    return (this._rtc_pairing = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("RTC连接超时"));
        this._rtc_pairing = null;
        cancel1();
        cancel2();
      }, 5000);

      const cancel1 = this.bind("mode-change", (event) => {
        if (this.mode === 2) {
          clearTimeout(timeout);
          this._rtc_pairing = null;
          resolve(event.detail);
          cancel1();
          cancel2();
        }
      });

      const cancel2 = this.bind("init-rtc-error", (event) => {
        const detail = event.detail;

        // 查找目标 connections
        const conn = this._rtcConnections.find(
          (conn) => conn._rtcId === detail.toRTCId
        );

        if (!conn) {
          // 未找到目标连接
          return;
        }

        // 关闭配对
        conn.close();

        reject(new Error(detail.message));
        this._rtc_pairing = null;
        cancel1();
        cancel2();
      });
    }));
  }

  // 获取用户信息
  async info(
    options = {
      // 使用在线查询的用户数据
      useOnline: false,
    }
  ) {
    // 尝试从本地卡片库上获取
    const cardManager = await this.#self.cardManager();
    const card = await cardManager.get(this.userId);

    if (!options.useOnline && card) {
      // 验证卡片是否被篡改
      const result = await this.verify(card);

      if (result) {
        return card;
      }

      console.error(
        new Error(
          `卡片验证失败：检测到本地用户卡片数据（用户ID：${this.userId}）已被篡改`
        )
      );
    }

    return new Promise((resolve, reject) => {
      // 直接尝试从对方获取卡片信息
      this.post({
        type: "get-card",
        userId: [this.userId],
        __internal_mark: 1,
      });

      // 超时
      const timeout = setTimeout(() => {
        reject(new Error("获取用户信息超时"));
        off();
      }, 10000);

      const off = cardManager.bind("update", async (event) => {
        if (event.detail.userId === this.userId) {
          // 验证卡片是否被篡改
          const result = await this.verify(event.detail);

          if (!result) {
            console.error(
              new Error(
                `卡片验证失败：检测到从对方获取的用户卡片数据（用户ID：${this.userId}）已被篡改`
              )
            );
            return;
          }

          clearTimeout(timeout);
          resolve(event.detail);
          off();
        }
      });
    });
  }

  // 发送消息给这个远端用户
  // post(msg, opts) {
  async post(msg, userSessionId) {
    if (this.#mode === 1 && !this.serverState) {
      throw new Error("未连接到对方");
    }

    if (typeof userSessionId === "object") {
      debugger;
      throw new Error("userSessionId 格式错误");
    }

    // 生成要发送的数据
    const data = await objectToUint8Array({
      msg,
      msgId: Math.random().toString(32).slice(2),
      userSessionId, // 目标的会话id
    });

    if (this._runInitRTC && !this._rtcConnections.length) {
      // 如果运行过initRTC，则再进行一次初始化，让下次可以使用rtc发送
      this.initRTC();
    }

    if (this.#mode === 1) {
      // 服务端转发模式，直接通过第一个发送
      this.#servers[0].sendTo(
        {
          userId: this.userId,
          userSessionId,
        },
        data
      );
    } else if (this.#mode === 2) {
      // 查找所有RTC连接中处于open状态的channel
      const channel = this._rtcConnections
        .filter(
          (conn) =>
            conn.connectionState === "connected" ||
            conn.connectionState === "connecting"
        )
        .flatMap((conn) => conn._dataChannels)
        .find((chan) => chan.readyState === "open");

      if (!channel) {
        // 未找到可用的channel，降级改用服务端发送
        this.#servers[0].sendTo(
          {
            userId: this.userId,
            userSessionId,
          },
          data
        );

        console.warn(new Error("未找到可用的RTC channel，改用服务端发送"));
        return;
      }

      channel.send(data);
    }
  }

  async trigger(name, data) {
    this.post({
      type: "trigger",
      name,
      data,
      __internal_mark: 1,
    });
  }
}
