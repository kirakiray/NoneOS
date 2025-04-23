const load = lm(import.meta);

// 初始化一些操作
Object.defineProperties($.fn, {
  // 获取本地app专属的handle
  dedicatedHandle: {
    async value() {
      if (this.tag !== "o-app") {
        throw new Error("dedicatedHandle can only be used on o-app component");
      }

      const mark = getAppMark(this[0]);

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
      const mark = getAppMark(this[0]);

      // 从远端设备中获取handle
      debugger;
    },
  },
});

const getAppMark = (app) => {
  const nappArr = app.src.split("/").filter((e) => e.endsWith(".napp"));
  const mark = nappArr.map((e) => e.replace(/\.napp$/, "")).join("-");
  return mark;
};
