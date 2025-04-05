import { getServers } from "./main.js";

// 缓存可用服务器列表
const serverCache = new Map();

// 通过服务端转发数据到目标用户
export const agentData = async ({
  friendId,
  data,
  userDirName, // 本地存储的用户数据的目录名
  timeout = 5000,
}) => {
  userDirName = userDirName || "main";

  // 检查缓存中是否有可用服务器
  const cacheKey = `${userDirName}:${friendId}`;
  const cachedServers = serverCache.get(cacheKey);
  
  let canUseSers = [];
  
  if (cachedServers && cachedServers.timestamp > Date.now()) {
    // 使用缓存的服务器列表
    canUseSers = cachedServers.servers;
  } else {
    // 缓存不存在或已过期，重新查找服务器
    const servers = await getServers(userDirName);

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
    
    // 更新缓存，设置2分钟过期时间
    if (canUseSers.length > 0) {
      serverCache.set(cacheKey, {
        servers: canUseSers,
        timestamp: Date.now() + 2 * 60 * 1000 // 2分钟后过期
      });
    }
  }

  if (!canUseSers.length) {
    return {
      result: false,
      notFindUser: true,
    };
  }

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
