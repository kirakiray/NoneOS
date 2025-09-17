import { Stanz } from "../../libs/stanz/main.js";
import { agentData } from "../hand-server/agent.js";
import { emit } from "../event.js";
import { cacheFile } from "../cache/main.js";

// ice服务器
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com" },
];

// 和用户建立连接的类
export class UserConnection extends Stanz {
  #handlers = []; // 存储所有的消息回调函数
  #userId; // 用户ID
  #useLocalUserDirName; // 用户目录名称
  #selfTabId; // 自己的tabId

  constructor({ userId, useLocalUserDirName, selfTabId }) {
    super({
      state: "not-ready", // 连接状态
      tabs: [], // 所有的用户网页标签链接
    });

    this.#userId = userId;
    this.#useLocalUserDirName = useLocalUserDirName;
    this.#selfTabId = selfTabId;
  }

  // 更新连接状态
  #updateConnectionState() {
    // 检查是否有可用的连接
    const hasAvailableConnection = this.tabs.some(
      (tab) => tab.state === "connected" || tab.state === "completed"
    );

    // 更新状态
    if (hasAvailableConnection) {
      this.state = "ready";
    } else {
      this.state = "not-ready";

      // TODO: 准备清除所有的task等待
    }
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
      useLocalUserDirName: this.#useLocalUserDirName,
      selfTabId: this.#selfTabId,
    });
    allConnections.add(targetTabCon);

    this.tabs.push(targetTabCon);

    // 注册消息处理
    targetTabCon.onMessage((data) => {
      this.#handlers.forEach((fn) => fn(data, targetTabCon));
    });

    // 监听TabConnection状态变化
    targetTabCon.watchTick((e) => {
      if (e.hasModified("state")) {
        this.#updateConnectionState();
      }
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
    let tabConnection;

    try {
      await this.watchUntil(() => this.state === "ready", 10000);
    } catch (error) {
      throw new Error(`发送请求失败`, {
        cause: error,
      });
    }

    if (tabId) {
      tabConnection = this.tabs.find((tab) => tab.remoteTabId === tabId);
    } else {
      // 如果没有指定tabId，则尝试找到可用的连接
      //   tabConnection = this.tabs.find(
      //     (tab) => tab.state === "connected" || tab.state === "completed"
      //   );
      tabConnection = this.tabs[0]; // 暂时先取第一个
    }

    if (tabConnection) {
      return tabConnection.send(msg);
    }
    throw new Error(`未找到tabId为${tabId}的连接`);
  }

  // 向对方发送连接请求
  connect() {
    if (this.state === "ready") {
      return;
    }

    this.state = "connecting";

    // 检查是否有可用的连接
    return agentData({
      friendId: this.#userId,
      useLocalUserDirName: this.#useLocalUserDirName,
      data: {
        kind: "connect-user",
        fromTabId: this.#selfTabId, // 从哪个tabId连接过去
      },
    }).then((resp) => {
      if (!resp.result) {
        if (resp.notFindUser) {
          // 没有找到用户
          this.state = "not-find-user";
        }
      }

      return resp;
    });
  }

  // 绑定消息回调函数，返回一个取消绑定的函数
  onMsg(fn) {
    this.#handlers.push(fn);

    return () => {
      this.#handlers.splice(this.#handlers.indexOf(fn), 1);
    };
  }
}

const allConnections = new Set();

// 页面刷新前，发送信息通知对面
if (typeof window === "object") {
  window.addEventListener("beforeunload", () => {
    allConnections.forEach((connection) => {
      connection.send({
        kind: "close",
      });
    });
  });
}

class TabConnection extends Stanz {
  #remoteTabId; // 远程 tabId
  #rtcConnection; // rtc连接
  #channels = new Map(); // 存储所有的数据通道
  #messageHandlers = []; // 消息处理函数
  #userId; // 用户ID
  #useLocalUserDirName; // 用户目录名称
  #selfTabId; // 自己的tabId
  #host; // 宿主UserConnection实例

  constructor({ remoteTabId, host, userId, useLocalUserDirName, selfTabId }) {
    super({
      state: "new", // 连接状态
      // new - 刚刚创建了一个 RTCPeerConnection 对象，并且尚未建立任何连接。
      // connecting - 正在尝试建立一个连接。这可能涉及到正在进行的信令交换、ICE候选收集等过程。
      // connected - 连接已经成功建立，媒体数据可以开始传输。
      // disconnected - 连接暂时丢失。尽管底层的网络连接可能已经中断，但如果网络状况改善，连接有可能自动恢复。
      // failed - 尝试建立连接失败，通常是由于网络问题或不兼容的媒体配置。
      // closed - 连接已经被用户主动关闭，或者因为错误而被关闭。
    });

    // channel是否成功
    this.#remoteTabId = remoteTabId;
    this.#host = host;
    this.#userId = userId;
    this.#useLocalUserDirName = useLocalUserDirName;
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
          useLocalUserDirName: this.#useLocalUserDirName,
          data: {
            kind: "agent-ice-candidate",
            candidate: JSON.stringify(e.candidate),
            toTabId: this.#remoteTabId, // 发送给目标设备的tabId
            fromTabId: this.#selfTabId,
          },
        });
      }
    };

    // 监听连接状态变化
    this.#rtcConnection.addEventListener("connectionstatechange", () => {
      this.state = this.#rtcConnection.connectionState;

      console.log("this.state: ", this.state);

      if (this.state === "connected") {
        // 主动发送根目录信息
        this.send({
          kind: "update-roots",
          dirs: [
            {
              name: "local",
            },
          ],
        });
      } else if (this.state === "closed") {
        // 监听状态变化，当状态为closed时清除所有绑定
        this.#clearAllBindings();
      }
    });
  }

  #needCloses = [];

  // 当连接关闭时
  whenClosed(func) {
    this.#needCloses.push(func);
  }

  // 清除所有绑定
  #clearAllBindings() {
    // 从host的tabs中移除自身
    const index = this.#host.tabs.indexOf(this);
    if (index !== -1) {
      this.#host.tabs.splice(index, 1);
    }

    this.#messageHandlers.splice(0, this.#messageHandlers.length);
    this.#channels.forEach((channel) => {
      channel.onmessage = null;
      channel.onclose = null;
      channel.onerror = null;
    });
    this.#rtcConnection.ondatachannel = null;
    this.#rtcConnection.onicecandidate = null;
    this.#rtcConnection.onconnectionstatechange = null;
    this.#rtcConnection.oniceconnectionstatechange = null;
    allConnections.delete(this);

    this.#needCloses.forEach((fn) => fn());
    this.#needCloses.splice(0, this.#needCloses.length);
  }

  get remoteTabId() {
    return this.#remoteTabId;
  }

  get rtcConnection() {
    return this.#rtcConnection;
  }

  // 初始化数据通道
  #initChannel(channel) {
    const promise = new Promise((resolve, reject) => {
      channel.onmessage = (e) => {
        let { data } = e;

        if (typeof data === "string") {
          try {
            data = JSON.parse(e.data);
            this.#messageHandlers.forEach((fn) => fn(data));
          } catch (err) {
            data = e.data;
          }
        }

        emit("receive-user-data", {
          data,
          tabConnection: this,
          fromUserId: this.#userId,
          fromTabId: this.#remoteTabId, // 发送给目标设备的tabId
          useLocalUserDirName: this.#useLocalUserDirName,
        });
      };

      channel.onopen = () => {
        this.isChannelInit = true;
        resolve(channel);
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
        reject(e.error);
      };
    });

    this.#channels.set(channel.label, promise);

    return promise;
  }

  // 获取或创建数据通道
  getChannel(label, isCreate = false) {
    let finnalChannel = this.#channels.get(label);

    if (finnalChannel) {
      return finnalChannel;
    }

    if (isCreate) {
      finnalChannel = this.#rtcConnection.createDataChannel(label);
      return this.#initChannel(finnalChannel);
    }

    return null;
  }

  // 发送消息
  async send(msg) {
    const channel = await this.getChannel("default", true);

    if (channel?.readyState === "open") {
      // 处理不同类型的消息数据
      let finnalData;
      if (msg instanceof Blob) {
        finnalData = await msg.arrayBuffer();
      } else if (msg instanceof Object && !(msg instanceof ArrayBuffer)) {
        finnalData = JSON.stringify(msg);
      } else {
        finnalData = msg;
      }

      if (typeof finnalData === "string" && finnalData.length > 1024 * 256) {
        // 如果消息数据大于256KB，则将其分割成多个小的消息块
        const hashs = await cacheFile(finnalData, {
          useLocalUserDirName: this.#useLocalUserDirName,
        });

        finnalData = JSON.stringify({
          kind: "bridge-chunks",
          hashs,
        });
      }

      channel.send(finnalData);
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
    // this.#channels.forEach((channel) => {
    //   channel.close();
    // });
    this.#channels.clear();
    this.#rtcConnection.close();
    // this.state = "closed";
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
