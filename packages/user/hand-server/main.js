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
      "./hand-shared-worker.js?userdir=" + (userDirName || "main"), // 添加括号
      import.meta.url
    ),
    {
      name: "hand-worker-" + (userDirName || "main"), // 添加括号
      type: "module",
    }
  ));

  handWorker.port.onmessage = (e) => {
    const { type, data } = e.data;
    switch (type) {
      case "update": {
        const { servers } = data;
        mergeServers(__handservers, servers); // 使用新函数
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

// 新增合并服务器函数
const mergeServers = (target, source) => {
  const currentKeys = new Set(target.map((s) => s.key));
  const newKeys = new Set(source.map((s) => s.key));

  // 添加新服务器（保持响应式特性）
  source.forEach((server) => {
    if (!currentKeys.has(server.key)) {
      target.push(server);
    }
  });

  // 反向遍历避免索引错位
  for (let i = target.length - 1; i >= 0; i--) {
    if (!newKeys.has(target[i].key)) {
      target.splice(i, 1);
    }
  }

  // 更新现有服务器数据
  source.forEach((server) => {
    const current = target.find((s) => s.key === server.key);
    current && Object.assign(current, server);
  });
};
