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

    let targetTabCon = this.tabs.find((e) => e.remoteTabId === tabId);

    if (targetTabCon) {
      return targetTabCon; // 返回已经存在的connection
    }

    targetTabCon = new TabConnection({
      remoteTabId: tabId,
      host: this,
      userId: this.#userId,
      userDirName: this.#userDirName,
      selfTabId: this.#selfTabId,
    });

    this.tabs.push(targetTabCon);

    // 注册消息处理
    targetTabCon.onMessage((data) => {
      this.#handlers.forEach((fn) => fn(data, tabId));
    });

    return targetTabCon;
  }

  get userId() {
    return this.#userId;
  }

  get rtcConnections() {
    return this.tabs.map((tab) => tab.rtcConnection);
  }

  get selfTabId() {
    return this.#selfTabId;
  }

  // 发送消息
  async send(msg, tabId) {
    const tabConnection = this.tabs.find((tab) => tab.remoteTabId === tabId);
    if (tabConnection) {
      return tabConnection.send(msg);
    }
    throw new Error(`未找到tabId为${tabId}的连接`);
  }

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
  #channels = new Map(); // 存储所有的数据通道
  #messageHandlers = []; // 消息处理函数
  #userId; // 用户ID
  #userDirName; // 用户目录名称
  #selfTabId; // 自己的tabId
  #host; // 宿主UserConnection实例

  constructor({ remoteTabId, host, userId, userDirName, selfTabId }) {
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
    this.#host = host;
    this.#userId = userId;
    this.#userDirName = userDirName;
    this.#selfTabId = selfTabId;

    // 创建rtc连接
    this.#rtcConnection = new RTCPeerConnection({
      iceServers,
    });

    // 设置事件处理
    this.#rtcConnection.ondatachannel = (e) => {
      this.#initChannel(e.channel);
    };

    this.#rtcConnection.onicecandidate = async (e) => {
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

    // 监听连接状态变化
    this.#rtcConnection.oniceconnectionstatechange = () => {
      this.state = this.#rtcConnection.iceConnectionState;
    };
  }

  get remoteTabId() {
    return this.#remoteTabId;
  }

  get rtcConnection() {
    return this.#rtcConnection;
  }

  // 初始化数据通道
  #initChannel(channel) {
    channel.onmessage = (e) => {
      if (typeof e.data !== "string") {
        debugger;
      }

      const data = JSON.parse(e.data);
      this.#messageHandlers.forEach((fn) => fn(data));
    };

    channel.onclose = () => {
      channel.onmessage = null;
      channel.onclose = null;
      channel.onerror = null;
      this.#channels.delete(channel.label);
    };

    channel.onerror = (e) => {
      console.error("数据通道错误:", e);
      channel.close();
    };

    this.#channels.set(channel.label, channel);
  }

  // 获取或创建数据通道
  getChannel(label, isCreate = false) {
    let targetChannel = this.#channels.get(label);

    if (targetChannel) {
      return targetChannel;
    }

    if (isCreate) {
      targetChannel = this.#rtcConnection.createDataChannel(label);
      this.#initChannel(targetChannel);
    }

    return targetChannel || null;
  }

  // 发送消息
  async send(msg) {
    const channel = this.getChannel("default", true);
    if (channel && channel.readyState === "open") {
      channel.send(typeof msg === "string" ? msg : JSON.stringify(msg));
      return true;
    }
    return false;
  }

  // 注册消息处理函数
  onMessage(fn) {
    this.#messageHandlers.push(fn);
    return () => {
      const index = this.#messageHandlers.indexOf(fn);
      if (index !== -1) {
        this.#messageHandlers.splice(index, 1);
      }
    };
  }

  // 关闭连接
  close() {
    this.#channels.forEach((channel) => channel.close());
    this.#channels.clear();
    this.#rtcConnection.close();
    this.state = "closed";
  }

  // 以下是中转方法
  createOffer() {
    return this.#rtcConnection.createOffer();
  }
  createAnswer() {
    return this.#rtcConnection.createAnswer();
  }
  setLocalDescription(description) {
    return this.#rtcConnection.setLocalDescription(description);
  }
  setRemoteDescription(description) {
    return this.#rtcConnection.setRemoteDescription(description);
  }
  addIceCandidate(candidate) {
    return this.#rtcConnection.addIceCandidate(candidate);
  }
}
