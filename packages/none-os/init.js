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

      const { getServers } = await load("/packages/user/hand-server/main.js");

      const servers = await getServers();

      // 确保有服务器在线
      await Promise.all(
        servers.map((server) => {
          if (
            server.connectionState === "disconnected" ||
            server.connectionState === "error"
          ) {
            server.connect();
          }

          return server.ready().catch(() => null);
        })
      );

      // 确保 servers 是否有一个能用的
      const usableServer = servers.find(
        (server) => server.connectionState === "connected"
      );

      if (!usableServer) {
        throw new Error("No usable server found");
      }

      const { getRemotes } = await load("/packages/util/get-remotes.js");
      const { connect } = await load("/packages/user/connection/main.js");

      const remotes = await getRemotes();

      // 等待连接成功
      const conns = await Promise.all(
        remotes.map(async (remote) => {
          const connection = connect({
            userId: remote.userId,
          });

          // 等待连接成功
          await connection
            .watchUntil(
              () =>
                connection.state === "ready" ||
                connection.state === "not-find-user"
            )
            .catch(() => null);

          return connection; // 返回连接对象或其他标识
        })
      );

      const { get } = await load("/packages/fs/main.js");
      const { getUserName } = await load("/packages/util/get-user-info.js");

      // 从已连接的设备中并行获取handle和用户信息
      const remoteHandles = await Promise.all(
        conns.map(async (connection) => {
          // 获取远程用户的用户名
          const userName = await getUserName(connection.userId);

          if (connection.state !== "ready") {
            return {
              userName,
              userId: connection.userId,
              handle: null,
              hasData: false,
            };
          }

          // 获取远程用户的专属handle
          const handle = await get(
            `$user-${connection.userId}:local/dedicated/${mark}`
          );

          return {
            userName,
            userId: connection.userId,
            handle,
            hasData: (await handle.length()) > 0,
          };
        })
      );

      return remoteHandles;
    },
  },
});

const getAppMark = (app) => {
  const firstPage = app[0];

  const nappArr = firstPage.src.split("/").filter((e) => e.endsWith(".napp"));
  const mark = nappArr.map((e) => e.replace(/\.napp$/, "")).join("-");
  return mark;
};
