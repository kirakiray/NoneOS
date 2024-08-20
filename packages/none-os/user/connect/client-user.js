import { User } from "../public-user.js";
import { emitEvent } from "./public.js";
import { connectors } from "./server-connector.js";

export class ClientUser extends User {
  #rtcConnection;
  #state = "disconnected";
  #channels = {};
  onstatechange = null;
  constructor(...args) {
    super(...args);
    this._init();
  }

  get state() {
    return this.#state;
  }

  // 发送数据给对面
  send(data) {
    const channel = this.#channels["initChannel"];
    channel.send(data);
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

    // targetChannel.onopen = () => {
    //   targetChannel.send(" 你收到了吗？");
    // };

    return targetChannel;
  }

  _init() {
    // 建立rtc实例
    const rtcPC = (this.#rtcConnection = new RTCPeerConnection());

    rtcPC.onconnectionstatechange = (event) => {
      //   console.log("onconnectionstatechange", rtcPC.connectionState, event);
      this.#state = rtcPC.connectionState;

      //   this.onstatechange &&
      //     this.onstatechange({
      //       target: this,
      //       currentTarget: this,
      //     });

      emitEvent("user-state-change", {
        originTarget: this,
        originEvent: event,
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
