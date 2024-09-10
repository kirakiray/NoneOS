import { getUserCard } from "../user/usercard.js";
import { User } from "../user/public-user.js";
import { servers } from "./server.js";

export const users = $.stanz([]);

export const connectUser = async (userId) => {
  const target = users.find((client) => client.id === userId);
  if (target) {
    return target;
  }

  const cards = await getUserCard();

  const targetUser = cards.find((e) => e.id === userId);

  if (!targetUser) {
    throw new Error(`not found usercard: ${userId}`);
  }

  const client = new ClientUser(targetUser);

  await client.connect();
};

const STARTCHANNEL = "startChannel";

export class ClientUser extends $.Stanz {
  #user = null;
  #rtcConnection;
  #channels = {};
  constructor(user) {
    if (!(user instanceof User)) {
      user = new User(user.data, user.dataSignature);
    }

    super({
      delayTime: 0, // 用户间的延迟时间
      state: "disconnected", // 连接状态
    });

    this.#user = user;
  }

  // 初始化rtc
  _init() {
    if (!users.some((e) => e.id === this.id)) {
      users.push(this);
    }

    let rtcPC = this.#rtcConnection;

    if (
      rtcPC
      // && (rtcPC.connectionState === "connected" ||
      //   rtcPC.connectionState === "connecting")
    ) {
      rtcPC.onconnectionstatechange = null;
      rtcPC.ondatachannel = null;
      rtcPC.onicecandidate = null;
      rtcPC.close();
    }

    // 建立rtc实例
    rtcPC = this.#rtcConnection = new RTCPeerConnection();

    rtcPC.onconnectionstatechange = () => {
      const state = rtcPC.connectionState;

      if (state === "connecting" || state === "connected") {
        this.state = state;
      }

      console.log("onconnectionstatechange: ", state);
    };

    rtcPC.ondatachannel = (event) => {
      const { channel } = event;

      this._bindChannel(channel);

      console.log("ondatachannel: ", channel);
    };

    rtcPC.onicecandidate = (event) => {
      const { candidate } = event;

      if (candidate) {
        // 传递 icecandidate
        this._serverAgentPost({
          step: "set-candidate",
          candidate,
        });

        // console.log("candidate: ", candidate);
      }
    };

    return rtcPC;
  }

  async connect() {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    // 连接前先查看是否有服务器可用，没有可用服务器就别发了
    await this._getServer();

    const rtcPC = this.#rtcConnection || this._init();

    // 必须在createOffer前创建信道，否则不会产生ice数据
    this._getChannel(STARTCHANNEL);

    const offer = await rtcPC.createOffer();

    // 设置给自身
    rtcPC.setLocalDescription(offer);

    const result = await this._serverAgentPost({
      step: "set-remote",
      offer,
    });

    return result;
  }

  // 发送数据给对面
  async send(data, channelName = STARTCHANNEL) {
    this._send(
      JSON.stringify({
        data,
      }),
      (channelName = STARTCHANNEL)
    );
  }
  async _send(data, channelName = STARTCHANNEL) {
    if (isPlainObject(data)) {
      data = JSON.stringify(data);
    }

    if (this.state === "closed") {
      // 重新连接
      await this.connect();
    }

    const targetChannel = await this._getChannel(channelName);

    if (this.state === "closed") {
      debugger;
    }

    targetChannel.send(data);
  }

  // 测试延迟
  ping(loopDelayTime) {
    if (this.state === "connected") {
      return new Promise((resolve) => {
        clearTimeout(this.__ping_timer);
        const pingTime = Date.now();
        this.__pingFunc = () => {
          this.__pingFunc = null;
          const delayTime = Date.now() - pingTime;

          this.delayTime = delayTime;

          resolve(delayTime);

          if (loopDelayTime) {
            this.__ping_timer = setTimeout(
              () => {
                this.ping(loopDelayTime);
              },
              loopDelayTime === true ? 10000 : loopDelayTime
            );
          }
        };
        this._send("__ping");
      });
    }

    return Promise.resolve("-");
  }

  // 通过代理转发的初始化信息
  async _agentConnect(data) {
    console.log("_agentConnect", data);

    let rtcPC = this.#rtcConnection || this._init();

    const { step } = data;

    switch (step) {
      case "set-remote":
        rtcPC = this._init();
        rtcPC.setRemoteDescription(data.offer);

        const anwserOffter = await rtcPC.createAnswer();
        rtcPC.setLocalDescription(anwserOffter);

        this._serverAgentPost({
          step: "answer-remote",
          anwser: anwserOffter,
        });
        break;
      case "set-candidate":
        const iceObj = new RTCIceCandidate(data.candidate);

        rtcPC.addIceCandidate(iceObj);
        break;
      case "answer-remote":
        rtcPC.setRemoteDescription(data.anwser);
        break;
    }
  }

  // 统一的初始化信道的方法
  _bindChannel(channel) {
    const channelName = channel.label;

    if (this.#channels[channelName]) {
      this.#channels[channelName].then((oldChannel) => {
        oldChannel.close();
      });
    }

    channel.addEventListener("close", async () => {
      console.log("channel close: ", channel.label, channel);

      if (channelName === STARTCHANNEL) {
        this.state = "closed";
      }

      const cachedChannel = await this.#channels[channel.label];
      if (cachedChannel === channel) {
        delete this.#channels[channel.label];
      }
    });

    channel.addEventListener("message", (e) => {
      this._onmsg(e, channel);
    });

    return (this.#channels[channelName] = new Promise((resolve, reject) => {
      channel.onopen = () => {
        resolve(channel);

        this.ping();
      };

      channel.onerror = (e) => {
        reject(e);
      };
    }));
  }

  // 获取或创建新的信道
  async _getChannel(
    channelName = "channel-" + Math.random().toString(26).slice(3)
  ) {
    if (this.#channels[channelName]) {
      return this.#channels[channelName];
    }

    const rtcPC = this.#rtcConnection;

    // 监听后立刻创建通道，否则createOffer再创建就会导致上面的ice监听失效
    const targetChannel = rtcPC.createDataChannel(channelName);

    this._bindChannel(targetChannel);

    return targetChannel;
  }

  async _onmsg(e, targetChannel) {
    let { data } = e;

    if (data === "__ping") {
      // 直接返回pong
      this._send("__pong");
      return;
    } else if (data === "__pong") {
      this.__pingFunc && this.__pingFunc();
      return;
    }

    if (typeof data === "string") {
      const result = JSON.parse(data);

      if (result.data) {
        this._onmessage &&
          this._onmessage({
            channel: targetChannel,
            data: result.data,
          });
      } else if (result.fs) {
        const { options, bid } = result.fs;
        const opts = await bridge(options);
        this._send({
          responseFs: {
            bid,
            ...opts,
          },
        });
      } else if (result.responseFs) {
        reponseData(result.responseFs, this);
      }
    }
  }

  // 查找最好的服务器进行发送
  async _getServer() {
    if (this._bestServer) {
      // 直接返回已设置的最好的服务器
      return this._bestServer;
    }

    // 先根据延迟进行排序
    const sers = servers
      .filter((e) => e.status === "connected")
      .sort((a, b) => {
        return a.delayTime - b.delayTime;
      });

    for (let ser of sers) {
      // 查找用户是否存在
      const sResult = await ser
        ._post({
          search: this.id,
        })
        .then((e) => e.json())
        .catch(() => null);

      if (!sResult || !sResult.user) {
        continue;
      }

      if (sResult.ok && sResult.user) {
        // 验证用户信息是否正确
        const user = new User(sResult.user.data, sResult.user.sign);

        if (user.id !== this.id || !(await user.verify())) {
          // 不符合规定都直接劝退
          continue;
        }
      }

      this._bestServer = ser;

      return ser;
    }

    const err = new Error("User not found on server");
    err.code = "userNotFound";

    throw err;
  }

  // 通过服务器转发内容
  async _serverAgentPost(data) {
    const ser = await this._getServer();

    return await ser
      ._post({
        agent: {
          targetId: this.id,
          data,
        },
      })
      .then((e) => e.json())
      .catch(() => null);
  }

  get id() {
    return this.#user.id;
  }

  get name() {
    return this.#user.get("userName");
  }

  get data() {
    return this.#user.data;
  }
}

function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}
