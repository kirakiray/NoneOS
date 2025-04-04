import { Stanz } from "../../libs/stanz/main.js";

// 和用户建立连接的类
export class UserConnection extends Stanz {
  #rtcConnections = new Set(); // 存储所有的RTCPeerConnection实例
  #handlers = []; // 存储所有的消息回调函数

  constructor() {
    super({
      state: "disconnected", // 连接状态
    });
  }

  // 发送消息
  async send(msg, tid) {}

  // 绑定消息回调函数，返回一个取消绑定的函数
  onMsg(fn) {
    this.#handlers.push(fn);

    return () => {
      this.#handlers.splice(this.#handlers.indexOf(fn), 1);
    };
  }
}
