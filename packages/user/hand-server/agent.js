import { getServers } from "./main.js";

// 通过服务端转发数据到目标用户
export const agentData = async ({
  friendId,
  data,
  userDirName, // 本地存储的用户数据的目录名
  timeout = 5000,
}) => {
  userDirName = userDirName || "main";

  const servers = await getServers(userDirName);

  const canUseSers = [];

  // 并行查找用户是否在线
  await Promise.all(
    servers.map(async (server) => {
      await server.watchUntil(
        () => server.connectionState === "connected",
        5000
      );

      const result = await server
        .post({
          type: "find-friend",
          friendId,
        })
        .catch(() => null);

      // 如果在线
      if (result) {
        // TODO: 验证用户数据是否正确
        canUseSers.push({ server, result });
      }
    })
  );

  let targetServer;

  for (let e of canUseSers) {
    // 转发请求
    const result = await e.server.post({
      type: "agent-data",
      friendId,
      data,
    });

    if (result.code === 200) {
      // 发送请求成功
      targetServer = e.server;
      break;
    }
  }

  return {
    result: true,
    targetServer,
  };
};
