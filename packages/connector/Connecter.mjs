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
    });

    this._channel = null;
    this.onmessage = null;

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
  }

  async offer() {
    const pc = this._pc;

    const channel = (this._channel = pc.createDataChannel("sendDataChannel"));

    channel.onmessage = (e) => {
      console.log("pc1 get message => ", e.data);
      if (this.onmessage) {
        this.onmessage(e.data);
      }
    };

    channel.addEventListener("close", () => {
      console.log("Data channel closed");
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

    pc.ondatachannel = (e) => {
      const { channel } = e;

      this._channel = channel;

      channel.onmessage = (event) => {
        console.log("pc2 get message => ", event.data);
        if (this.onmessage) {
          this.onmessage(event.data);
        }
      };
    };

    pc.setRemoteDescription(remoteDesc);

    const desc = await pc.createAnswer();
    pc.setLocalDescription(desc);

    return desc;
  }

  send(text) {
    this._channel.send(text);
  }
}
