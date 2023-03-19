Page(async ({ load }) => {
  const { generateKeyPair } = await load("/public/crypto.mjs");

  let savedData = {};

  if (localStorage._saveUserSetting) {
    savedData = JSON.parse(localStorage._saveUserSetting);
  } else {
    const data = await generateKeyPair();

    savedData = {
      userName: "user_" + Math.random().toString(32).slice(2),
      ...data,
    };

    localStorage._saveUserSetting = JSON.stringify(savedData);
  }

  async function syncUser() {
    const pc = new RTCPeerConnection();

    pc.addEventListener("icecandidate", (event) => {
      console.log(
        `pc1 ICE candidate: ${
          event.candidate ? event.candidate.candidate : "(null)"
        }`
      );
    });

    const p1Channel = pc.createDataChannel("sendDataChannel");

    p1Channel.onmessage = (e) => {
      console.log("pc1 get message => ", e.data);
    };

    const desc = await pc.createOffer();

    console.log("desc => ", desc);
  }

  return {
    proto: {
      async fetchUser() {
        const text = await (
          await fetch("https://testhome.kirakiray.com:4433/api2/", {
            method: "GET",
            mode: "cors",
          })
        ).json();

        console.log("text => ", text);
      },
    },
    async ready() {
      const formData = this.shadow.form();

      Object.assign(formData, savedData);

      formData.watch(() => {
        localStorage._saveUserSetting = JSON.stringify({
          ...savedData,
          ...formData,
        });
      });

      syncUser();

      this.fetchUser();
    },
  };
});
