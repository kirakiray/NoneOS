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

      const { getRemotes } = await load("/packages/util/get-remotes.js");
      const { connect } = await load("/packages/user/connection/main.js");

      const remotes = await getRemotes();

      // 等待连接成功
      const conns = await Promise.all(
        remotes.map(async (remote) => {
          const connection = connect({
            userId: remote.userId,
          });

          await connection.watchUntil(
            () =>
              connection.state === "ready" ||
              connection.state === "not-find-user"
          );

          return connection; // 返回连接对象或其他标识
        })
      );

      const remoteHandles = [];

      const { get } = await load("/packages/fs/main.js");
      const { getUserName } = await load("/packages/util/get-user-info.js");

      // 从远端设备中获取handle
      await Promise.all(
        conns.map(async (connection) => {
          if (connection.state === "ready") {
            const handle = await get(
              `$user-${connection.userId}:local/dedicated/${mark}`
            );

            // 添加远端的handle
            remoteHandles.push({
              userName: await getUserName(connection.userId),
              userId: connection.userId,
              handle,
              hasData: (await handle.length()) > 0, // 存在这个应用的数据
            });
          }
        })
      );

      return remoteHandles;
    },
  },
});

const getAppMark = (app) => {
  const nappArr = app.src.split("/").filter((e) => e.endsWith(".napp"));
  const mark = nappArr.map((e) => e.replace(/\.napp$/, "")).join("-");
  return mark;
};
