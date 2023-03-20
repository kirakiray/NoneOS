Page(async ({ load }) => {
  const { generateKeyPair, generateRandomId } = await load(
    "/public/crypto.mjs"
  );
  const { RTCAgent } = await load("/public/connector.mjs");

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
    async ready() {
      const formData = this.shadow.form();

      Object.assign(formData, savedData);

      formData.watch(() => {
        localStorage._saveUserSetting = JSON.stringify({
          ...savedData,
          ...formData,
        });
      });

      this.shadow.$("#user-id").html = formData.id;

      const agent = new RTCAgent({ ...savedData, ...formData });
    },
  };
});
