import { HandServer } from "./handserver.js";
import { Stanz } from "../../libs/stanz/main.js";
import { getUserStore } from "../main.js";

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
  const __handservers = (selfUserStore.__handservers = new Stanz({}));

  // 根据配置的服务器信息进行生成对象
  selfUserStore.servers.forEach((e) => {
    const client = new HandServer({
      store: selfUserStore,
      url: e.url,
    });

    __handservers.push(client);

    client.connect();
  });

  return __handservers;
};
