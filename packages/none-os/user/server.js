import { getSelfUserCardData } from "./main.js";
import { User } from "./public-user.js";

// 可访问服务器列表
const serverList = ["http://localhost:5569/user"];

// 已连接的用户
const clients = new Map();

// 和服务器进行相连的实例
class ServerConnector {
  #serverUrl = null;
  #status = "disconnected";
  #apiID;
  #serverID;
  constructor(serverUrl) {
    this.#serverUrl = serverUrl;
    this.init();
  }

  // 连接服务器的初始化操作
  async init() {
    const selfCardData = await getSelfUserCardData();

    // 创建一个 EventSource 对象，连接到 SSE 端点
    const eventSource = (this.__sse = new EventSource(
      `${this.#serverUrl}/${encodeURIComponent(JSON.stringify(selfCardData))}`
    ));

    // 监听消息事件
    eventSource.onmessage = async (event) => {
      const result = JSON.parse(event.data);

      this._ontake && this._ontake(result);

      if (result.__type) {
        switch (result.__type) {
          case "init":
            // 初始化用户和服务器信息
            this.serverName = result.serverName;
            this.serverVersion = result.serverVersion;
            this.#serverID = result.serverID;
            this.#apiID = result.apiID;

            this._emitchange("connected");

            break;

          case "agent-connect":
            // 用户之间尝试进行握手操作
            let targetUserClient = clients.get(result.fromUserID);

            if (!targetUserClient) {
              targetUserClient = new ClientUser(
                result.fromUser.data,
                result.fromUser.sign
              );

              if (targetUserClient.id === result.fromUserID) {
                clients.set(result.fromUserID, targetUserClient);
              }
            }

            // 初始化 connect
            targetUserClient._agentConnect(result.data);

            break;
          default:
            console.log(result);
            return;
        }
      } else {
        if (this.onmessage) {
          this.onmessage(result);
        }
      }
    };

    // 监听错误事件
    eventSource.onerror = (e) => {
      console.error("Server Error occurred:", e);
      // 在这里处理错误
      eventSource.close();

      this._emitchange("closed");
    };

    // 监听连接关闭事件
    eventSource.onclose = () => {
      console.log("Server Connection closed", this);

      this._emitchange("closed");
    };
  }

  // 改变状态
  _emitchange(status) {
    this.#status = status;
    this.onchange && this.onchange();

    if (status === "closed") {
      this.onclose && this.onclose();
    }
  }

  // 提交数据
  async _post(data) {
    const postUrl = new URL(this.#serverUrl).origin + this.#apiID;

    return fetch(postUrl, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // 获取推荐用户
  async getRecommend() {
    debugger;
  }

  get status() {
    return this.#status;
  }

  get serverUrl() {
    return this.#serverUrl;
  }

  get serverID() {
    return this.#serverID;
  }
}

// 连接用户
export const linkUser = async (data, dataSignature) => {
  const userData = new User(data, dataSignature);

  let targetCUser = clients.get(userData.userID);

  if (!targetCUser) {
    targetCUser = new ClientUser(data, dataSignature);

    targetCUser.connect();

    clients.set(targetCUser.id, targetCUser);
  }

  return targetCUser;
};

class ClientUser extends User {
  #rtcConnection;
  #state = "disconnected";
  #channels = {};
  onstatechange = null;
  constructor(...args) {
    super(...args);
    this._init();
  }

  // 连接用户
  async connect() {
    if (this.#state === "connected" || this.#state === "connecting") {
      return;
    }

    const rtcPC = this.#rtcConnection;

    // 必须在createOffer前创建信道，否则不会产生ice数据
    this._createChannel("initChannel");

    const offer = await rtcPC.createOffer();

    // 设置给自身
    rtcPC.setLocalDescription(offer);

    this._serverAgentPost({
      step: "set-remote",
      offer,
    });
  }

  // 创建新的信道
  _createChannel(channelName = "channel-" + Math.random().slice(3)) {
    const rtcPC = this.#rtcConnection;

    // 监听后立刻创建通道，否则createOffer再创建就会导致上面的ice监听失效
    const targetChannel = rtcPC.createDataChannel(channelName);

    targetChannel.onmessage = (e) => {
      this.onmessage &&
        this.onmessage({
          channel: targetChannel,
          data: e.data,
        });
    };

    targetChannel.addEventListener("close", () => {
      delete this.#channels[channelName];
    });

    this.#channels[channelName] = targetChannel;

    targetChannel.onopen = () => {
      targetChannel.send(" 你收到了吗？");
    };

    // setTimeout(() => {
    //   targetChannel.send(" 你收到了吗？");
    // }, 1000);

    return targetChannel;
  }

  _init() {
    // 建立rtc实例
    const rtcPC = (this.#rtcConnection = new RTCPeerConnection());

    rtcPC.onconnectionstatechange = (event) => {
      //   console.log("onconnectionstatechange", rtcPC.connectionState, event);
      this.#state = rtcPC.connectionState;

      this.onstatechange &&
        this.onstatechange({
          target: this,
          currentTarget: this,
        });
    };

    rtcPC.ondatachannel = (event) => {
      const { channel } = event;

      channel.addEventListener("close", () => {
        delete this.#channels[channel.label];
      });

      this.#channels[channel.label] = channel;

      channel.onmessage = (e) => {
        console.log(channel.label, " get message => ", e.data);

        this.onmessage &&
          this.onmessage({
            channel,
            data: e.data,
          });
      };
    };

    rtcPC.addEventListener("icecandidate", (event) => {
      const { candidate } = event;

      if (candidate) {
        // 传递 icecandidate
        this._serverAgentPost({
          step: "set-candidate",
          candidate,
        });

        // console.log("candidate: ", candidate);
      }
    });
  }

  // 通过代理转发的初始化信息
  async _agentConnect(data) {
    const rtcPC = this.#rtcConnection;

    const { step } = data;

    switch (step) {
      case "set-remote":
        rtcPC.setRemoteDescription(data.offer);

        const anwserOffter = await rtcPC.createAnswer();
        rtcPC.setLocalDescription(anwserOffter);

        // console.log("set remote offer ", data.offer);

        this._serverAgentPost({
          step: "answer-remote",
          anwser: anwserOffter,
        });
        break;
      case "set-candidate":
        const iceObj = new RTCIceCandidate(data.candidate);

        rtcPC.addIceCandidate(iceObj);
        // console.log("set candidate ", iceObj);
        break;
      case "answer-remote":
        rtcPC.setRemoteDescription(data.anwser);
        // console.log("set remote answer ", data.anwser);
        break;
    }
  }

  // 通过服务器转发内容
  async _serverAgentPost(data) {
    // TODO: 直接先通过第一个server 进行传递数据，后期需要添加查询服务器进行连接
    const result = await connectors[0]._post({
      agent: {
        targetId: this.id,
        data,
      },
    });

    return result;
  }
}

// 已有的服务器
const connectors = serverList.map((e) => {
  return new ServerConnector(e);
});

export const getServers = () => {
  return [...connectors];
};
