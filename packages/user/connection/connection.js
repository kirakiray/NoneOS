import { Stanz } from "../../libs/stanz/main.js";
import { agentData } from "../hand-server/agent.js";

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
  #rtcConnections = new Map(); // 存储所有的RTCPeerConnection实例
  #handlers = []; // 存储所有的消息回调函数
  #userId; // 用户ID
  #localSelfUser; // 所属用户的store
  #selfTabId; // 自己的tabId

  constructor({ userId, localSelfUser, selfTabId }) {
    super({
      state: "not-ready", // 连接状态
    });

    this.#localSelfUser = localSelfUser; // 所属用户的store
    this.#userId = userId;
    this.#selfTabId = selfTabId;
  }

  // 初始化 connection
  getConnection(tabId) {
    if (!tabId) {
      throw new Error("缺少 tabId");
    }

    if (this.#rtcConnections.get(tabId)) {
      return this.#rtcConnections.get(tabId);
    }

    // 创建rtc连接
    const rtcConnection = new RTCPeerConnection({
      iceServers,
    });
    rtcConnection._tabId = tabId;
    rtcConnection._host = this;
    rtcConnection._channels = new Map(); // TODO: 疑似可以直接使用 dataChannels 对象

    this.#rtcConnections.set(tabId, rtcConnection);

    rtcConnection.ondatachannel = (e) => {
      const channel = e.channel;
      channel.onmessage = (e) => {
        if (typeof e.data !== "string") {
          debugger;
        }

        const data = JSON.parse(e.data);
        this.#handlers.forEach((fn) => fn(data, rtcConnection._tabId));
      };

      channel.onclose = () => {
        channel.onmessage = null;
        channel.onclose = null;
        channel.onerror = null;
        rtcConnection._channels.delete(channel.label);
      };

      channel.onerror = (e) => {
        console.error("数据通道错误:", e);
        channel.close();
      };

      rtcConnection._channels.set(channel.label, channel);
    };

    rtcConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // 发送ICE候选给目标用户
        debugger;
      }
    };

    return rtcConnection;
  }

  get userId() {
    return this.#userId;
  }

  get rtcConnections() {
    return Array.from(this.#rtcConnections);
  }

  get selfTabId() {
    return this.#selfTabId;
  }

  // 发送消息
  async send(msg, tabId) {}

  // 绑定消息回调函数，返回一个取消绑定的函数
  onMsg(fn) {
    this.#handlers.push(fn);

    return () => {
      this.#handlers.splice(this.#handlers.indexOf(fn), 1);
    };
  }
}
