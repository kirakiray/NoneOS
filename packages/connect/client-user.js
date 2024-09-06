import { User } from "../user/public-user.js";
import { emitEvent } from "./public.js";
import { servers } from "./servers.js";

const STARTCHANNEL = "startChannel";

export class ClientUser extends User {
  #rtcConnection;
  #state = "disconnected";
  #channels = {};
  #delayTime = 0;
  onstatechange = null;
  constructor(...args) {
    super(...args);
    this._init();
  }

  get state() {
    return this.#state;
  }

  get delayTime() {
    return this.#delayTime;
  }

  // 重新初始化主要信道
  // _reInitChannel() {
  //   if (!this.__init_channel_resolve) {
  //     clearTimeout(this.__ping_timer);

  //     this.#channels[STARTCHANNEL] = new Promise((resolve) => {
  //       this.__init_channel_resolve = (channel) => {
  //         delete this.__init_channel_resolve;

  //         channel.addEventListener("close", async () => {
  //           const initChannel = await this.#channels[STARTCHANNEL];
  //           if (channel === initChannel) {
  //             this.#state = "closed";

  //             console.log("init close:", channel);

  //             emitEvent("user-state-change", {
  //               originTarget: this,
  //             });

  //             this._reInitChannel();
  //           }
  //         });

  //         resolve(channel);
  //       };
  //     });
  //   }
  // }

  _init() {
    // this._reInitChannel();

    // 建立rtc实例
    const rtcPC = (this.#rtcConnection = new RTCPeerConnection());

    rtcPC.onconnectionstatechange = (event) => {
      this.#state = rtcPC.connectionState;

      console.log("onconnectionstatechange: ", rtcPC.connectionState);

      emitEvent("user-state-change", {
        originTarget: this,
      });
    };

    rtcPC.ondatachannel = async (event) => {
      const { channel } = event;

      this._initChannel(channel);

      console.log("ondatachannel: ", channel);
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

  // 测试延迟
  ping(loopDelayTime) {
    return new Promise((resolve) => {
      clearTimeout(this.__ping_timer);
      const pingTime = Date.now();
      this.__pingFunc = () => {
        this.__pingFunc = null;
        const delayTime = Date.now() - pingTime;

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
      this.send("__ping");
    });
  }

  _onmsg(e, targetChannel) {
    if (e.data === "__ping") {
      // 直接返回pong
      this.send("__pong");
      return;
    } else if (e.data === "__pong") {
      this.__pingFunc && this.__pingFunc();
      return;
    }

    let data = e.data;

    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    this.onmessage &&
      this.onmessage({
        channel: targetChannel,
        data,
      });
  }

  // 发送数据给对面
  async send(data, channelName = STARTCHANNEL) {
    const channel = await this.#channels[channelName];

    if (channel) {
      let sdata = data;
      if (data instanceof Object) {
        sdata = JSON.stringify(data);
      }
      channel.send(sdata);
    } else {
      console.log("no-channel");
    }
  }

  // 连接用户
  async connect() {
    if (this.#state === "connected" || this.#state === "connecting") {
      return;
    }

    // 连接前先查看是否有服务器可用，没有可用服务器就别发了
    await this._getServer();

    const rtcPC = this.#rtcConnection;

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

  // 统一的初始化信道的方法
  _initChannel(channel) {
    const channelName = channel.label;

    if (this.#channels[channelName]) {
      this.#channels[channelName].then((oldChannel) => {
        oldChannel.close();
      });
    }

    this.#channels[channelName] = new Promise((resolve, reject) => {
      channel.onopen = () => {
        resolve(channel);
      };
    });

    channel.addEventListener("close", async () => {
      const cachedChannel = await this.#channels[channel.label];
      if (cachedChannel === channel) {
        delete this.#channels[channel.label];
      }
    });

    channel.onmessage = (e) => {
      this._onmsg(e, channel);
    };
  }

  // 创建新的信道
  _getChannel(channelName = "channel-" + Math.random().slice(3)) {
    const rtcPC = this.#rtcConnection;

    // 监听后立刻创建通道，否则createOffer再创建就会导致上面的ice监听失效
    const targetChannel = rtcPC.createDataChannel(channelName);

    this._initChannel(targetChannel);

    return targetChannel;
  }

  // 通过代理转发的初始化信息
  async _agentConnect(data) {
    const rtcPC = this.#rtcConnection;

    console.log("_agentConnect", data);

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

  // 查找最好的服务器进行发送
  async _getServer() {
    if (this._bestServer) {
      // 直接返回已设置的最好的服务器
      return this._bestServer;
    }

    // 先根据延迟进行排序
    const sers = servers
      .map((e) => e._server)
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
}
