export default class Connecter extends EventTarget {
  constructor(agrees, userInfo) {
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

    this.state = "new";

    pc.addEventListener("connectionstatechange", () => {
      console.log("connectionState:", pc.connectionState);
      const e = new Event("state-change");
      this.state = e.state = pc.connectionState;
      this.dispatchEvent(e);
    });

    this._userInfo = userInfo;
    this._agrees = agrees;
    this.channels = {};
    this.agreements = {};

    pc.addEventListener("datachannel", (e) => {
      const { channel } = e;

      this._bindChannel(channel);
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
  }

  async offer() {
    const pc = this._pc;

    const initChannel = this.createChannel("init");

    initChannel.onopen = () => {
      initChannel.send(
        JSON.stringify({
          type: "init-agrees",
          agrees: this._agrees.map((f) => {
            const { agreementName, version } = f;
            return {
              agreementName,
              version,
            };
          }),
        })
      );
    };

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
    if (this.channels[name]) {
      throw `This channel already exists : ${name}`;
    }

    const channel = this._pc.createDataChannel(name);

    this._bindChannel(channel);

    return channel;
  }

  _bindChannel(channel) {
    this.channels[channel.label] = channel;

    channel.addEventListener("message", (e) => {
      const event = new Event("message");
      event.data = e.data;
      event.channel = channel;
      this.dispatchEvent(event);
      console.log(`channel ${channel.label} msg => `, e.data);
    });

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

    if (channel.label === "init") {
      channel.addEventListener("message", (e) => {
        let data;
        try {
          data = JSON.parse(e.data);
        } catch (err) {
          console.log("msg => ", data);
          return;
        }

        switch (data.type) {
          case "init-agrees":
            {
              const remoteAgrees = data.agrees;

              const accepts = [];

              this._agrees.forEach((e) => {
                const target = remoteAgrees.find(
                  (e2) =>
                    e2.agreementName === e.agreementName &&
                    e2.version === e.version
                );

                if (target) {
                  accepts.push(target.agreementName);
                }
              });

              this._initAgrees(accepts, channel);
            }
            break;
          case "init-agree-dock":
            {
              this._initAgrees(data.accepts, null, true);
            }
            break;
        }
      });
    }
  }

  _initAgrees(accepts, originChannel, isDock = false) {
    accepts.forEach(async (name) => {
      const targetFunc = this._agrees.find((f) => f.agreementName === name);
      const { channels: channelsName, agreementName } = targetFunc;

      const channels = {};

      if (!isDock) {
        await Promise.all(
          channelsName.map(
            (name) =>
              new Promise((resolve) => {
                if (this.channels[name]) {
                  throw "Duplicate channel name";
                }

                const channel = (channels[name] = this.createChannel(name));

                channel.addEventListener("open", () => {
                  resolve();
                });
              })
          )
        );

        originChannel.send(
          JSON.stringify({
            type: "init-agree-dock",
            accepts,
          })
        );
      } else {
        channelsName.forEach((name) => {
          channels[name] = this.channels[name];
        });
      }

      this.agreements[agreementName] = targetFunc({
        channels,
        originate: !isDock,
        userInfo: this._userInfo,
      });
    });
  }
}
