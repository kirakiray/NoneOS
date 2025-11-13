import { pack, unpack } from "../util/pack.js";
import { objectToUint8Array, uint8ArrayToObject } from "../util/msg-pack.js";

export class HandServerClient extends EventTarget {
  #url;
  #user;
  constructor({ url, user }) {
    super();
    this.#url = url;
    this.socket = null;
    this.#user = user;
    this.state = "unauth"; // 未认证：unauth；认证中：authing；认证完成：authed; 已关闭：closed
    this.stateUpdateTime = Date.now(); // 最近更新状态时间
    this.delay = 0; // 延迟时间
    this.serverName = null; // 服务器名称
    this.serverVersion = null; // 服务器版本
    this.serverCid = null; // 服务器CID
    this.delays = []; // 延迟曲线
  }

  async init() {
    if (this.socket) {
      return;
    }

    // 创建WebSocket连接
    this.socket = new WebSocket(this.#url);

    // 绑定事件监听器
    this.socket.addEventListener("open", this._onOpen.bind(this));
    this.socket.addEventListener("message", this._onMessage.bind(this));
    this.socket.addEventListener("close", this._onClose.bind(this));
    this.socket.addEventListener("error", this._onError.bind(this));
  }

  // 主动断开连接（不进行重连）
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this._changeState("closed");
  }

  async findUser(userId) {
    if (this.state !== "authed") {
      throw new Error("用户未认证");
    }

    await this._send({ type: "find_user", userId });

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("find_user超时"));
      }, 5000);

      const handler = (event) => {
        const data = event.detail;

        if (data.type === "response_find_user" && data.userId === userId) {
          // 判断成功后，注销监听
          this.removeEventListener("message", handler);
          clearTimeout(timeoutId);
          const reData = { ...data };
          delete reData.type;
          resolve(reData);
        }
      };
      this.addEventListener("message", handler);
    });
  }

  // 检查用户是否在线
  async isUserOnline(userId) {
    const userData = await this.findUser(userId);
    return userData.isOnline;
  }

  // 发送数据给指定用户
  async sendTo(options, data) {
    if (this.state !== "authed") {
      throw new Error("用户未认证");
    }

    if (typeof options === "string") {
      options = { userId: options };
    }

    if (!options.passWrapMsg) {
      data = await objectToUint8Array({ msg: data });
    }

    const packedData = await pack({ type: "agent_data", options }, data);
    this.socket.send(packedData);
  }

  _send(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket连接未打开");
    }

    if (typeof data === "object") {
      this.socket.send(JSON.stringify(data));
    }
  }

  // 处理WebSocket打开事件
  _onOpen() {
    // console.log("WebSocket连接已打开");
  }

  startDelayCheckLoop() {
    clearTimeout(this.pingInterval);
    const loop = () => {
      this.checkDelay();
      this.pingInterval = setTimeout(loop, 10000);
    };
    this.pingInterval = setTimeout(loop, 10000);
  }

  async checkDelay() {
    if (this.state !== "authed") {
      throw new Error("用户未认证");
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this._pingTime = Date.now();
      this._send({ type: "ping" });

      // 超过8秒没有响应，认为延迟很大
      this._delayTimeout = setTimeout(() => {
        if (this._pingTime) {
          this.delay = 8000;
          this.delays.push({
            time: this._pingTime,
            delay: 8000,
          });
          this.dispatchEvent(
            new CustomEvent("check-delay", {
              detail: {
                time: this._pingTime,
                delay: 8000,
              },
            })
          );

          this._pingTime = null;
        }
      }, 8000);
    }
  }

  // 处理WebSocket消息事件
  async _onMessage(event) {
    if (event.data instanceof Blob) {
      // blob 转 uint8array
      const arrayBuffer = await event.data.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let { data, obj: info } = await unpack(uint8Array);

      if (info.type === "agent_data") {
        data = await uint8ArrayToObject(data);

        this.dispatchEvent(
          new CustomEvent("agent_data", {
            detail: { ...info, data },
          })
        );

        if (this.onData) {
          this.onData(info.fromUserId, data.msg, { ...info, data });
        }

        this.#user.dispatchEvent(
          new CustomEvent("received-server-agent-data", {
            detail: {
              response: { ...info, data },
              server: this,
            },
          })
        );
      }

      return;
    }

    let responseData;

    try {
      responseData = JSON.parse(event.data);

      if (responseData.type === "pong") {
        if (this._pingTime) {
          this.delay = Date.now() - this._pingTime;
          this.delays.push({
            time: this._pingTime,
            delay: this.delay,
          });
          this.dispatchEvent(
            new CustomEvent("check-delay", {
              detail: {
                time: this._pingTime,
                delay: this.delay,
              },
            })
          );

          this._pingTime = null;
          clearTimeout(this._delayTimeout); // 清除之前的定时器

          // 告诉服务端延迟时间
          this._send({ type: "update_delay", delay: this.delay });
        }
        return;
      }
    } catch (e) {
      console.error(e);
      console.log("收到消息:", event.data);
      return;
    }

    // 下面是跟服务端进行认证的相关逻辑
    if (responseData.type === "need_auth") {
      const info = await this.#user.info();

      // 签名信息
      const signedData = await this.#user.sign({
        cid: responseData.cid,
        userSessionId: this.#user.sessionId,
        info,
      });

      this._changeState("authing");

      // 发送签名信息，证明是用户本人
      this._send({ type: "authentication", signedData });
    } else if (responseData.type === "auth_success") {
      this._changeState("authed");
      this.startDelayCheckLoop();
      this.checkDelay();
    } else if (responseData.type === "server_info") {
      this.serverName = responseData.serverName;
      this.serverVersion = responseData.serverVersion;
      this.serverCid = responseData.cid;
      this.dispatchEvent(
        new CustomEvent("server-info", { detail: responseData })
      );
    }

    this.dispatchEvent(new CustomEvent("message", { detail: responseData }));
  }

  _changeState(state) {
    const oldState = this.state;
    this.state = state;
    this.stateUpdateTime = Date.now(); // 最近更新状态时间

    // 如果状态从非关闭状态变为关闭状态，触发断开事件
    if (oldState !== "closed" && state === "closed") {
      this.dispatchEvent(new CustomEvent("disconnected"));
    }

    this.dispatchEvent(new Event(state));
    this.dispatchEvent(new Event("change-state"));
    if (this.onchange) {
      this.onchange(this);
    }
  }

  // 处理WebSocket关闭事件
  _onClose(event) {
    clearTimeout(this.pingInterval);
    clearTimeout(this._delayTimeout);
    this.delays.push({
      time: Date.now(),
      delay: 8000,
    });
    this._changeState("closed");
    console.log("WebSocket连接已关闭:", event);
  }

  // 处理WebSocket错误事件
  _onError(event) {
    clearTimeout(this.pingInterval);
    clearTimeout(this._delayTimeout);
    console.error("WebSocket错误:", event);

    // 触发错误事件
    this.dispatchEvent(new CustomEvent("error", { detail: event }));
  }

  bind(eventName, callback) {
    this.addEventListener(eventName, callback);

    return () => {
      this.removeEventListener(eventName, callback);
    };
  }
}
