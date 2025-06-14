import { getUserStore } from "../user-store.js";
import { initServers } from "./init-servers.js";

const pool = {};

// 获取服务器列表
export const getServers = async (useLocalUserDirName) => {
  useLocalUserDirName = useLocalUserDirName || "main";

  if (pool[useLocalUserDirName]) {
    return pool[useLocalUserDirName];
  }

  return (pool[useLocalUserDirName] = new Promise(async (resolve) => {
    const selfUserStore = await getUserStore(useLocalUserDirName);
    await selfUserStore.ready(true);

    // 初始化服务器列表
    if (!selfUserStore.servers || selfUserStore.servers.length === 0) {
      selfUserStore.servers = [];
      if (location.host.includes("localhost")) {
        await selfUserStore.servers.ready();

        // 加入测试地址
        selfUserStore.servers.push(
          {
            url: "ws://localhost:5579/",
          },
          {
            url: "ws://localhost:5589/",
          }
        );

        await selfUserStore.servers.ready(true);
      } else {
        // 加入正式地址
        selfUserStore.servers.push(
          {
            url: "wss://hand-cn.tutous.com:812",
          },
          {
            url: "wss://hand-us1.tutous.com",
          }
        );

        await selfUserStore.servers.ready(true);
      }
    }

    await selfUserStore.servers.ready(true);

    // 等待100ms，确保数据同步完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    resolve(await initServers(useLocalUserDirName));
  }));
};

// 添加服务器
export const addServer = async (url, useLocalUserDirName) => {
  const selfUserStore = await getUserStore(useLocalUserDirName);

  selfUserStore.servers.push({
    url,
  });
};

// 删除服务器
export const removeServer = async (url, useLocalUserDirName) => {
  const selfUserStore = await getUserStore(useLocalUserDirName);

  const targetIndex = selfUserStore.servers.findIndex(
    (server) => server.url === url
  );

  if (targetIndex !== -1) {
    selfUserStore.servers.splice(targetIndex, 1); // 移除服务器
  }
};
