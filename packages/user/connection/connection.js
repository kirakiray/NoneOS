import { Stanz } from "../../libs/stanz/main.js";

// ice服务器
const iceServers = [
  { urls: "stun:stun.tutous.com" },
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com" },
];

// 和用户建立连接的类
export class UserConnection extends Stanz {
  #rtcConnections = new Set(); // 存储所有的RTCPeerConnection实例
  #handlers = []; // 存储所有的消息回调函数
  #userId; // 用户ID
  #selfUser; // 所属用户的store
  #selfTab; // 自己的tabId

  constructor({ userId, selfUser, selfTab }) {
    super({
      state: "", // 连接状态
    });

    this.#selfUser = selfUser; // 所属用户的store
    this.#userId = userId;
    this.#selfTab = selfTab;
  }

  // 初始化 connection
  async createConnection(tabId) {
    if (this.#rtcConnections.get(tabId)) {
      return this.#rtcConnections.get(tabId);
    }

    // 创建rtc连接
    const rtcConnection = new RTCPeerConnection({
      iceServers,
    });

    this.#rtcConnections.set(tabId, rtcConnection);

    return rtcConnection;
  }

  get userId() {
    return this.#userId;
  }

  get rtcConnections() {
    return Array.from(this.#rtcConnections);
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
