export default class Connecter extends EventTarget {
  constructor() {
    super();
    const pc = (this._pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.qq.com" },
        { urls: "stun:stun.syncthing.net" },
        { urls: "stun:stun.miwifi.com" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
    }));

    pc.addEventListener("connectionstatechange", () => {
      console.log("connectionState:", pc.connectionState);
      const e = new Event("state-change");
      e.state = pc.connectionState;
      this.dispatchEvent(e);
    });

    this.channels = {};

    pc.addEventListener("datachannel", (e) => {
      const { channel } = e;

      console.log("ondatachannel => ", e);

      this._bindChannel(channel);

      channel.onmessage = (e) => {
        this._dispatchMsg(e, channel);
      };
    });

    this.ices = new Promise((resolve) => {
      const ices = [];

      pc.addEventListener("icecandidate", (event) => {
        if (event.candidate) {
          ices.push(event.candidate);
        } else {
          resolve(ices);
        }
      });
    });

    this.agreements = {};
  }

  async offer() {
    const pc = this._pc;

    const channel = this.createChannel("init");

    channel.onmessage = (e) => {
      this._dispatchMsg(e, channel);
    };

    const desc = await pc.createOffer();

    pc.setLocalDescription(desc);

    return desc;
  }

  _dispatchMsg(e, channel) {
    const event = new Event("message");
    event.data = e.data;
    event.channel = channel;
    this.dispatchEvent(event);
    console.log(`channel ${channel.label} msg2 => `, e.data);
  }

  addIces(ices) {
    if (ices instanceof Array) {
      ices.forEach((ice) => this._pc.addIceCandidate(ice));
    } else {
      this._pc.addIceCandidate(ices);
    }
  }

  setRemoteDesc(desc) {
    this._pc.setRemoteDescription(desc);
  }

  async answer(remoteDesc) {
    const pc = this._pc;

    pc.setRemoteDescription(remoteDesc);

    const desc = await pc.createAnswer();
    pc.setLocalDescription(desc);

    return desc;
  }

  send(text) {
    this.channels.init.send(text);
  }

  createChannel(name) {
    if (this.channels[name]) {
      throw `This channel already exists : ${name}`;
    }

    const channel = this._pc.createDataChannel(name);

    this._bindChannel(channel);

    return channel;
  }

  _bindChannel(channel) {
    this.channels[channel.label] = channel;

    channel.addEventListener("close", (e) => {
      console.log("Data channel closed", e);
      if (channel.label === "init") {
        this.dispatchEvent(new Event("close"));
      } else {
        const event = new Event("channel-close");
        event.channel = channel;
        this.dispatchEvent(event);
        delete this.channels[channel.label];
      }
    });

    channel.addEventListener("error", (e) => {
      console.log("Data channel error", e);
    });
  }

  agree(task) {
    console.log("agree => ", task);
  }
}
