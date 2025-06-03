// 将数据通过服务端转发到目标用户
import { getServers } from "./main.js";
import { signData } from "../sign.js";

// 缓存可用服务器列表
const serverCache = new Map();

// 查找在线用户
const findOnlineUser = async (friendId, useLocalUserDirName) => {
  // 检查缓存中是否有可用服务器
  const cacheKey = `${useLocalUserDirName}:${friendId}`;
  const cachedServers = serverCache.get(cacheKey);

  let canUseSers = [];

  if (cachedServers && cachedServers.timestamp > Date.now()) {
    // 使用缓存的服务器列表
    canUseSers = await cachedServers.servers;
  } else {
    const cachePms = (async () => {
      const canUseSers = [];

      // 缓存不存在或已过期，重新查找服务器
      const servers = await getServers(useLocalUserDirName);

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

      return canUseSers;
    })();

    serverCache.set(cacheKey, {
      servers: cachePms,
      timestamp: Date.now() + 2 * 60 * 1000, // 2分钟后过期
    });

    canUseSers = await cachePms;
  }

  return canUseSers;
};

// 通过服务端转发数据到目标用户
export const agentData = async ({
  friendId,
  data,
  useLocalUserDirName, // 本地存储的用户数据的目录名
  timeout = 5000,
}) => {
  useLocalUserDirName = useLocalUserDirName || "main";

  const canUseSers = await findOnlineUser(friendId, useLocalUserDirName);

  if (!canUseSers.length) {
    console.error("未查找到目标用户 " + friendId + " 所在的服务器");
    return {
      result: false,
      notFindUser: true,
    };
  }

  let targetServer;

  const signedData = await signData(data, useLocalUserDirName);

  for (let e of canUseSers) {
    // 转发请求
    const result = await e.server.post({
      type: "agent-data",
      friendId,
      // data,
      data: signedData,
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
