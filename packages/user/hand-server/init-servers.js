// 服务器对象采用独立映射机制：系统维护一个共享的真实servers实例，每个页面通过独立的映射对象来访问和操作这些服务器
import { Stanz } from "../../libs/stanz/main.js";
import { HandServer } from "./handserver.js";
import { getUserStore } from "../user-store.js";

export const servers = new Stanz([]);

export const initServers = async (useLocalUserDirName) => {
  useLocalUserDirName = useLocalUserDirName || "main";
  const selfUserStore = await getUserStore(useLocalUserDirName);
  await selfUserStore.ready(true);

  selfUserStore.servers.forEach((serverInfo) => {
    const client = new HandServer({
      store: selfUserStore,
      url: serverInfo.url,
    });

    // 发起连接
    client.connect();

    servers.push(client);
  });
};
