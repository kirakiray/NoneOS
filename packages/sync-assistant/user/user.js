Page(async ({ load }) => {
  const { generateKeyPair, generateRandomId } = await load(
    "/public/crypto.mjs"
  );

  const { default: fileSync } = await load("../file-sync.mjs");

  const { default: RTCAgent } = await load("../../connector/RTCAgent.mjs");

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

      rtcAgent.addEventListener("update-users", (e) => {
        const { users } = rtcAgent;
        this.users = users;
      });

      rtcAgent.addEventListener("ws-open", () => {
        this.isConnectWS = true;
      });

      rtcAgent.addEventListener("ws-close", () => {
        this.isConnectWS = false;
      });

      rtcAgent.addEventListener("connector-change", (e) => {
        console.log("connector-change", e);

        if (e.add) {
          const target = e.add;

          target.agree(fileSync);

          this.linkedUsers.push({
            _connector: target,
            disabled: true,
            val: "",
            logs: [],
          });

          target.addEventListener("state-change", (e) => {
            const obj = this.linkedUsers.find((e2) => e2._connector === target);
            const { state } = e;

            if (obj) {
              if (state === "connected") {
                obj.disabled = false;
              } else {
                obj.disabled = true;
              }
            }
          });

          target.addEventListener("message", (e) => {
            const obj = this.linkedUsers.find((e2) => e2._connector === target);
            obj.logs.push(e.data);
          });
        }
        if (e.remove) {
          const id = this.linkedUsers.findIndex(
            (e2) => e2._connector === e.remove
          );
          if (id > -1) {
            this.linkedUsers.splice(id, 1);
          }
        }
      });
    },
    proto: {
      reloadUser() {
        this._rtcAgent.update();
      },
      async connectServer() {
        const serverUrl = this.shadow.$('[name="server"]').value;

        await this._rtcAgent.lookup(serverUrl);

        this.step = 2;
      },

      async linkClient(item) {
        item.connect();
      },

      sendMsg(item) {
        const { val } = item;
        item.val = "";

        item.logs.push("self:" + val);

        item._connector.send(val);
        // this._rtcAgent._connector.send(text);
      },
    },
  };
});
