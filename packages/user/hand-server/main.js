import { Stanz } from "../../libs/stanz/main.js";
import { getUserStore } from "../user-store.js";

// 获取服务器列表
export const getServers = async (userDirName) => {
  const selfUserStore = await getUserStore(userDirName);
  await selfUserStore.ready(true);

  // 初始化服务器列表
  if (!selfUserStore.servers || selfUserStore.servers.length === 0) {
    selfUserStore.servers = [];
    if (location.host.includes("localhost")) {
      // 加入测试地址
      selfUserStore.servers.push({
        url: "ws://localhost:5579/",
      });

      await selfUserStore.servers.ready();
    } else {
      // TODO: 加入官方推荐的地址
      debugger;
    }
  }

  if (selfUserStore.__handservers) {
    return selfUserStore.__handservers;
  }

  // 生成服务器对象数据
  const __handservers = (selfUserStore.__handservers = new Stanz([]));

  const handWorker = (selfUserStore.__handWorker = new SharedWorker(
    new URL(
      "./hand-shared-worker.js?userdir=" + userDirName || "main",
      import.meta.url
    ),
    {
      name: "hand-worker-" + userDirName || "main",
      type: "module",
    }
  ));

  handWorker.port.onmessage = (e) => {
    const { type, data } = e.data;
    switch (type) {
      case "update": {
        const { servers } = data;

        // 合并服务器列表
        const currentKeys = new Set(__handservers.map((s) => s.key));

        // 添加新服务器
        servers.forEach((server) => {
          if (!currentKeys.has(server.key)) {
            __handservers.push(server);
          }
        });

        // 移除不存在的服务器
        const newKeys = new Set(servers.map((s) => s.key));
        __handservers.forEach((server, index) => {
          if (!newKeys.has(server.key)) {
            __handservers.splice(index, 1);
          }
        });

        // 已存在的更新数据
        servers.forEach((server) => {
          const currentServer = __handservers.find((s) => s.key === server.key);
          if (currentServer) {
            Object.assign(currentServer, server);
          }
        });

        console.log("服务器列表初始化", servers);
        break;
      }
    }
  };

  // 标签关闭时，发送关闭消息
  window.addEventListener("beforeunload", () => {
    handWorker.port.postMessage({
      type: "close",
    });
  });

  return __handservers;
};
