import { User } from "/packages/user/public-user.js";
import { getSelfUserInfo } from "/packages/user/main.js";
import { servers } from "../main.js";

const STARTCHANNEL = "startChannel";

export class UserClient extends $.Stanz {
  #rtcConnection; // 主体rtc连接对象
  #channels = {}; // 存放channel 的对象
  #user; // 用户数据
  constructor(opt) {
    super({
      /**
       * state 的状态按顺序如下:
       * disconnected: 断开连接
       * connecting: 正在连接中
       * connected: 已经连接
       * closed: 已经关闭
       */
      state: "disconnected",
    });

    const { data, sign } = opt;
    const user = (this.#user = new User(data, sign));

    Object.assign(this, {
      userId: user.id,
      userName: user.name,
      time: user.get("time"),
    });
  }

  async verify() {
    return await this.#user.verify();
  }

  _onmsg(e, channel) {
    // channel 响应数据
    debugger;
  }

  // 统一的初始化信道的方法
  _bindChannel(channel) {
    channel.onmessage = (e) => this._onmsg(e, channel);

    channel.addEventListener("close", async () => {
      console.log("channel close: ", channel.label, channel);

      const cachedChannel = await this.#channels[channel.label];

      if (cachedChannel === channel) {
        delete this.#channels[channel.label];

        if (!Object.entries(this.#channels).length) {
          // 没有通道的时候，代表已经关闭
          this.state = "closed";
        }
      }
    });

    channel.onopen = () => {
      debugger;
    };

    channel.onerror = (e) => {
      debugger;
    };

    return channel;
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

    return this._bindChannel(targetChannel);
  }

  init() {
    const rtcPC = (this.#rtcConnection = new RTCPeerConnection());

    // rtcPC.onopen = () => {
    //   debugger;
    // };

    rtcPC.ondatachannel = (event) => {
      const { channel } = event;

      debugger;
      // console.log("ondatachannel: ", channel);
    };

    rtcPC.onicecandidate = (event) => {
      const { candidate } = event;

      if (candidate) {
        // 传递 icecandidate
        this._serverAgentPost({
          step: "set-candidate",
          candidate,
        });

        console.log("candidate: ", candidate);
      }
    };

    // rtcPC.onerror = () => {
    //   debugger;
    // };

    // rtcPC.onclose = () => {
    //   debugger;
    // };

    return rtcPC;
  }

  // 连接这个用户
  async connect() {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    this.state = "connecting";

    const rtcPC = this.init(); // 开始初始化

    const channel = await this._getChannel(STARTCHANNEL);

    const offer = await rtcPC.createOffer();

    // 设置给自身
    rtcPC.setLocalDescription(offer);

    await this._serverAgentPost({
      step: "set-remote",
      offer,
    });

    return true;
  }
  // 通过服务器转发内容
  async _serverAgentPost(data) {
    const ser = await this._getServer();

    if (ser) {
      return await ser
        ._post({
          agent: {
            targetId: this.userId,
            data,
          },
        })
        .then((e) => e.json())
        .catch(() => null);
    }

    return false;
  }

  // 查找最好的服务器进行发送
  async _getServer() {
    if (this._bestServer) {
      // 直接返回已设置的最好的服务器
      return this._bestServer;
    }

    return (this._bestServer = new Promise(async (resolve, reject) => {
      // 先根据延迟进行排序
      const sers = (
        await Promise.all(
          servers.map(async (e) => {
            await e.ping();
            return e;
          })
        )
      ).sort((a, b) => {
        return a.delayTime - b.delayTime;
      });

      for (let ser of sers) {
        // 查找用户是否存在
        const sResult = await ser
          ._post({
            search: this.userId,
          })
          .then((e) => e.json())
          .catch(() => null);

        if (!sResult || !sResult.user) {
          continue;
        }

        if (sResult.ok && sResult.user) {
          // 验证用户信息是否正确
          const user = new User(sResult.user.data, sResult.user.sign);

          if (user.id !== this.userId || !(await user.verify())) {
            // 不符合规定都直接劝退
            continue;
          }
        }

        resolve(ser);
      }

      const err = new Error("User not found on server");
      err.code = "userNotFound";

      reject(err);
    }));
  }

  // 通过服务端转发到用户
  _onServerAgent(data) {
    let rtcPC = this.#rtcConnection;

    if (!rtcPC) {
      rtcPC = this.init();
    }

    console.log("server agent : ", data);

    switch (data.step) {
      case "set-candidate":
        // 添加到本地信号
        const iceObj = new RTCIceCandidate(data.candidate);
        rtcPC.addIceCandidate(iceObj);
        break;

      case "set-remote":
        debugger;
        break;
      default:
        debugger;
        break;
    }
  }
}
