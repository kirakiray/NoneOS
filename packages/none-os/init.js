const load = lm(import.meta);

// 初始化一些操作
Object.defineProperties($.fn, {
  dedicatedHandle: {
    async value() {
      if (this.tag !== "o-app") {
        throw new Error("dedicatedHandle can only be used on o-app component");
      }

      const nappArr = this[0].src.split("/").filter((e) => e.endsWith(".napp"));
      const mark = nappArr.map((e) => e.replace(/\.napp$/, "")).join("-");

      const { get } = await load("/packages/fs/main.js");

      // 给app挂载getCacheHandle方法
      return get(`local/dedicated/${mark}`, {
        create: "dir",
      });
    },
  },
});
