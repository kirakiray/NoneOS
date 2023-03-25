Page(async ({ load }) => {
  const { generateKeyPair, generateRandomId } = await load(
    "/public/crypto.mjs"
  );

  const { default: RTCAgent } = await load("../../../connector/RTCAgent.mjs");

  let savedData = {};

  if (localStorage._saveUserSetting) {
    savedData = JSON.parse(localStorage._saveUserSetting);
  } else {
    const data = await generateKeyPair();

    savedData = {
      userName: "user_" + Math.random().toString(32).slice(2),
      id: generateRandomId(),
      ...data,
    };

    localStorage._saveUserSetting = JSON.stringify(savedData);
  }

  return {
    data: {
      isConnectWS: false,
      step: 1,
      // 可以连接的用户
      users: [],
      // 已经连接的用户
      linkedUsers: [],
    },
    async ready() {
      const formData = this.shadow.$("#step-1").form();

      Object.assign(formData, savedData);

      formData.watch(() => {
        localStorage._saveUserSetting = JSON.stringify({
          ...savedData,
          ...formData,
        });
      });

      this.shadow.$("#user-id").text = formData.id;

      const rtcAgent = (this._rtcAgent = new RTCAgent({
        ...savedData,
        ...formData,
      }));

      rtcAgent.addEventListener("updateUsers", (e) => {
        const { users } = rtcAgent;
        this.users = users;
      });
    },
    proto: {
      reloadUser() {
        this._rtcAgent.update();
      },
      async connectServer() {
        const serverUrl = this.shadow.$('[name="server"]').value;

        await this._rtcAgent.lookup(serverUrl);

        this.isConnectWS = true;
        this.step = 2;
      },

      async linkClient(item) {
        item.connect();
      },

      sendMessage() {
        const text = this.shadow.$("#inputer").value;
        this.shadow.$("#inputer").value = "";

        // this._rtcAgent._connector.send(text);
      },
    },
  };
});
