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

      this.channels[channel.label] = channel;

      channel.onmessage = (e) => {
        const event = new Event("message");
        event.data = e.data;
        this.dispatchEvent(event);

        console.log(`channel ${channel.label} msg2 => `, e.data);
      };

      if (channel.label === "init") {
        channel.addEventListener("close", (e) => {
          console.log("Data channel closed", e);
          this.dispatchEvent(new Event("close"));
        });
      }
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

    const channel = pc.createDataChannel("init");

    this.channels.init = channel;

    channel.onmessage = (e) => {
      const event = new Event("message");
      const data = (event.data = e.data);

      let json;
      if (typeof data === "string") {
        try {
          json = JSON.parse(data);
        } catch (err) {}
      }

      this.dispatchEvent(event);

      console.log("channel msg => ", e.data);
    };

    channel.addEventListener("close", (e) => {
      console.log("Data channel closed", e);
      this.dispatchEvent(new Event("close"));
    });

    channel.addEventListener("error", (e) => {
      console.log("Data channel error", e);
    });

    const desc = await pc.createOffer();

    pc.setLocalDescription(desc);

    return desc;
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
    if (name === "init") {
      throw "You cannot create a channel named init";
    }

    if (this.channels[name]) {
      throw `This channel already exists : ${name}`;
    }

    const channel = this._pc.createDataChannel(name);

    channel.addEventListener("close", (e) => {
      console.log("Data channel closed", e);
      const event = new Event("channel-close");
      event.channel = channel;
      this.dispatchEvent(event);
      delete this.channels[channel.label];
    });

    return channel;
  }

  agree(task) {
    console.log("agree => ", task);
  }
}
