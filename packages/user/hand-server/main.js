import { Stanz } from "../../libs/stanz/main.js";
import { getUserStore } from "../user-store.js";
import { emit } from "../event.js";
import { verifyData } from "../verify.js";
import { getHash } from "../../fs/util.js";
import { HandServer } from "./handserver.js";

// 获取服务器列表
export const getServers = async (useLocalUserDirName) => {
  useLocalUserDirName = useLocalUserDirName || "main";
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
          url: "wss://hand-ca.tutous.com",
        }
      );

      await selfUserStore.servers.ready(true);
    }

    // 等待300ms，确保数据同步完成
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (selfUserStore.__handservers) {
    return selfUserStore.__handservers;
  }

  selfUserStore.__handservers = new Promise((resolve, reject) => {
    const servers = new Stanz([]);
    selfUserStore.servers.forEach((serverInfo) => {
      const client1 = new HandServer({
        store: selfUserStore,
        url: serverInfo.url,
      });

      // 发起连接
      client1.connect();

      servers.push(client1);
    });

    resolve(servers);
  });

  return selfUserStore.__handservers;
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
