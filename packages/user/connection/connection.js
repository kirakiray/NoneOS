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
  #userDirName; // 用户目录名称
  #selfTabId; // 自己的tabId

  constructor({ userId, userDirName, selfTabId }) {
    super({
      state: "not-ready", // 连接状态
      tabs: [], // 所有的用户网页标签链接
    });

    this.#userId = userId;
    this.#userDirName = userDirName;
    this.#selfTabId = selfTabId;
  }

  // 初始化 connection
  getConnection(tabId) {
    if (!tabId) {
      throw new Error("缺少 tabId");
    }

    // if (this.#rtcConnections.get(tabId)) {
    //   return this.#rtcConnections.get(tabId);
    // }

    let targetTabCon = this.tabs.find((e) => e.remoteTabId === tabId);

    if (targetTabCon) {
      return targetTabCon; // 返回已经存在的connection
    }

    targetTabCon = new TabConnection({
      remoteTabId: tabId,
      host: this,
    });

    this.tabs.push(tabCon);

    // 创建rtc连接
    const rtcConnection = new RTCPeerConnection({
      iceServers,
    });

    Object.defineProperties(rtcConnection, {
      _tabId: {
        value: tabId,
      },
      _host: {
        value: this,
      },
      _channels: {
        value: new Map(),
      },
      getChannel: {
        value: (label, isCreate) => {
          let targetChannel = rtcConnection._channels.get(label);

          if (targetChannel) {
            return targetChannel;
          }

          if (isCreate) {
            targetChannel = rtcConnection.createDataChannel(label);

            this.#initChannel(targetChannel, rtcConnection);
          }

          return targetChannel || null;
        },
      },
    });

    this.#rtcConnections.set(tabId, rtcConnection);

    rtcConnection.ondatachannel = (e) => {
      this.#initChannel(e.channel, rtcConnection);
    };

    rtcConnection.onicecandidate = async (e) => {
      if (e.candidate) {
        // 将 candidate 转为字符串发送给目标设备
        agentData({
          friendId: this.#userId,
          userDirName: this.#userDirName,
          data: {
            kind: "agent-ice-candidate",
            candidate: JSON.stringify(e.candidate),
            tabId: this.#selfTabId,
          },
        });
      }
    };

    return rtcConnection;
  }

  #initChannel(channel, rtcConnection) {
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

class TabConnection extends Stanz {
  #remoteTabId; // 远程 tabId
  #rtcConnection; // rtc连接
  constructor({ remoteTabId }) {
    super({
      state: "new", // 连接状态
      // "new": 初始状态，尚未开始 ICE 候选交换。
      // "checking": 正在检查候选以尝试建立连接。
      // "connected": 至少一个 ICE 候选对已经成功连接。
      // "completed": 所有 ICE 候选对都已检查完毕，连接完成。
      // "failed": ICE 候选检查失败。
      // "disconnected": 连接暂时断开。
      // "closed": ICE 连接已关闭。
    });

    this.#remoteTabId = remoteTabId;
    const rtcConnection = (this.#rtcConnection = new RTCPeerConnection({
      iceServers,
    }));
  }

  get remoteTabId() {
    return this.#remoteTabId;
  }

  getChannel(label, isCreate) {}
}
