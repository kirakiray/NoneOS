import { User } from "./public-user.js";

export class ClientUser extends User {
  #status = "disconnected";
  #rtcConnection = null;
  #channels = [];
  constructor(...args) {
    super(...args);

    // 建立rtc实例
    // this.#rtcConnection = new RTCPeerConnection();
    const rtcPC = (this.#rtcConnection = new RTCPeerConnection());

    rtcPC.ondatachannel = (event) => {
      console.log("ondatachannel: ", event);
    };

    // const p1Channel = rtcPC.createDataChannel("publicChannel");

    // p1Channel.onmessage = (e) => {
    //   console.log("rtcPC get message => ", e.data);
    // };

    // p1Channel.send("init channel");
  }

  // 发送数据给服务端
  async post(data) {
    if (this.#status === "disconnected") {
      console.warn("target user disconnected");
      return;
    }

    debugger;
  }

  // 开始初始化信息
  async _agentConnect(data) {
    const rtcPC = this.#rtcConnection;

    const { step } = data;

    switch (step) {
      case "set-remote":
        debugger;
        rtcPC.setRemoteDescription(data.offer);

        if (data.candidates) {
          data.candidates.forEach((e) => {});
          debugger;
        }

        const anwserOffter = await rtcPC.createAnswer();
        this._serverAgentPost({
          step: "answer-remote",
          anwser: anwserOffter,
        });
        break;
      case "answer-remote":
        rtcPC.setRemoteDescription(data.anwser);
        debugger;
        break;
    }
  }

  // 添加传输的信道
  _createChannel(channelName = "publicChannel") {
    const rtcPC = this.#rtcConnection;

    return new Promise((resolve) => {
      let iceFunc, targetChannel;
      const candidates = [];
      rtcPC.addEventListener(
        "icecandidate",
        (iceFunc = (event) => {
          const { candidate } = event;

          if (!candidate) {
            rtcPC.removeEventListener("icecandidate", iceFunc);

            resolve({
              candidates,
              channel: targetChannel,
            });
            return;
          }

          candidates.push(candidate.candidate);

          console.log(candidate);
        })
      );

      targetChannel = rtcPC.createDataChannel(channelName);

      targetChannel.onmessage = (e) => {
        console.log("rtcPC get message => ", e.data);
      };
    });
  }

  // 连接用户
  async connect(data) {
    const rtcPC = this.#rtcConnection;

    // 必须先创建信道听，后createOffer才能获取到candidate
    const cPms = this._createChannel();

    const offer = await rtcPC.createOffer();

    // 设置给自身
    rtcPC.setLocalDescription(offer);

    const { candidates, channel } = await cPms;

    this.#channels.push(channel);

    this._serverAgentPost({
      step: "set-remote",
      offer,
      candidates,
    });
  }

  // 通过服务器转发数据给指定的用户
  async _serverAgentPost(data) {
    fetch(this.postUrl, {
      method: "POST",
      body: JSON.stringify({
        agent: {
          targetId: this.id,
          data,
        },
      }),
    });
  }

  // 初始化通道
  async init(server) {
    this._server = server;
  }

  async close() {
    debugger;
    this._server = null;
  }

  get postUrl() {
    return new URL(this._server.serverUrl).origin + this._server.apiID;
  }
}
