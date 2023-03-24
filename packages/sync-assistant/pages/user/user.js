Page(async ({ load }) => {
  const { generateKeyPair, generateRandomId } = await load(
    "/public/crypto.mjs"
  );

  const { RTCAgent } = await load("../../connector.mjs");

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

      // setTimeout(() => {
      //   this._rtcAgent._connector.onmessage = (text) => {
      //     this.shadow.$("#log-container").html += `${text}<br>`;
      //   };
      // }, 1000);
    },
    proto: {
      async connectServer() {
        const serverUrl = this.shadow.$('[name="server"]').value;

        await this._rtcAgent.lookup(serverUrl);

        this.isConnectWS = true;
        this.step = 2;
      },

      async linkClient(data) {
        debugger;
      },

      sendMessage() {
        const text = this.shadow.$("#inputer").value;
        this.shadow.$("#inputer").value = "";

        // this._rtcAgent._connector.send(text);
      },
    },
  };
});
