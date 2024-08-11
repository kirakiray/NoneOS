import { User } from "./public-user.js";

export class ClientUser extends User {
  #status = "disconnected";
  #rtcConnection = null;
  #channels = {};
  constructor(...args) {
    super(...args);

    // 建立rtc实例
    const rtcPC = (this.#rtcConnection = new RTCPeerConnection());

    rtcPC.ondatachannel = (event) => {
      const { channel } = event;

      this.#channels[channel.label] = channel;

      channel.onmessage = (e) => {
        console.log(channel.label, " get message => ", e.data);
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

        console.log("candidate: ", candidate);
      }
    });
  }

  // 给对面用户端发送数据
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
        rtcPC.setRemoteDescription(data.offer);

        const anwserOffter = await rtcPC.createAnswer();
        rtcPC.setLocalDescription(anwserOffter);

        console.log("set remote offer ", data.offer);

        this._serverAgentPost({
          step: "answer-remote",
          anwser: anwserOffter,
        });
        break;
      case "set-candidate":
        const iceObj = new RTCIceCandidate(data.candidate);

        rtcPC.addIceCandidate(iceObj);
        console.log("set candidate ", iceObj);
        break;
      case "answer-remote":
        rtcPC.setRemoteDescription(data.anwser);
        console.log("set remote answer ", data.anwser);
        break;
    }
  }

  // 创建新的信道
  _createChannel(channelName = "initChannel") {
    const rtcPC = this.#rtcConnection;

    // 监听后立刻创建通道，否则createOffer再创建就会导致上面的ice监听失效
    const targetChannel = rtcPC.createDataChannel(channelName);

    targetChannel.onmessage = (e) => {
      console.log("rtcPC get message => ", e.data);
    };

    this.#channels[channelName] = targetChannel;

    setTimeout(() => {
      targetChannel.send(" 你收到了吗？");
    }, 1000);
  }

  // 连接用户
  async connect(data) {
    const rtcPC = this.#rtcConnection;

    // 必须在createOffer前创建信道，否则不会产生ice数据
    this._createChannel();

    const offer = await rtcPC.createOffer();

    // 设置给自身
    rtcPC.setLocalDescription(offer);

    this._serverAgentPost({
      step: "set-remote",
      offer,
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
