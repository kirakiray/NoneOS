const load = lm(import.meta);

// 初始化一些操作
Object.defineProperties($.fn, {
  // 获取本地app专属的handle
  dedicatedHandle: {
    async value() {
      if (this.tag !== "o-app") {
        throw new Error("dedicatedHandle can only be used on o-app component");
      }

      if (!this.length) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 获取文件数据依赖第一个page元素的src
      }

      const mark = getAppMark(this);

      const { get } = await load("/packages/fs/main.js");

      // 给app挂载getCacheHandle方法
      return get(`local/dedicated/${mark}`, {
        create: "dir",
      });
    },
  },
  // 获取远端设备同属app的专属handle
  dedicatedRemoteHandle: {
    async value() {
      if (this.tag !== "o-app") {
        throw new Error(
          "dedicatedRemoteHandle can only be used on o-app component"
        );
      }
      if (!this.length) {
        await new Promise((resolve) => setTimeout(resolve, 200)); // 获取文件数据依赖第一个page元素的src
      }

      const mark = getAppMark(this);

      const { createUser } = await load("/packages/new-user/main.js");
      const localUser = await createUser();

      await localUser.connectAllServers();

      // 获取我的设备
      const myDevices = await localUser.myDevices();

      const { get } = await load("/packages/fs/main.js");

      const remoteHandles = await Promise.all(
        myDevices.map(async (device) => {
          const handle = await get(
            `$user-${device.userId}:local/dedicated/${mark}`
          );

          const hasData = (await handle.length()) > 0;

          return {
            userName: device.name,
            userId: device.userId,
            handle,
            hasData,
          };
        })
      );

      return remoteHandles;
    },
  },
  // 判断当前应用是不是处于焦点状态
  focused: {
    value() {
      const selfAppFrame = this.parent;

      if (!selfAppFrame.is("n-app-frame")) {
        return true;
      }

      const siblingsFrames = selfAppFrame.siblings;
      if (siblingsFrames.length === 0) {
        // 只有自己，绝对是焦点
        return true;
      }

      // 判断自己是不是最大 zIndex 的元素，就是焦点
      for (let e of siblingsFrames) {
        if (e.item.zIndex > selfAppFrame.item.zIndex) {
          return false;
        }
      }

      return true;
    },
  },
});

const getAppMark = (app) => {
  const firstPage = app[0];

  const nappArr = firstPage.src.split("/").filter((e) => e.endsWith(".napp"));
  const mark = nappArr.map((e) => e.replace(/\.napp$/, "")).join("-");
  return mark;
};
