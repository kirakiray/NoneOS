import { getServers, addServer, removeServer } from "./hand-server/main.js";
import { getUserStore } from "./user-store.js";
import { getDeviceStore } from "./device/main.js";
import { on } from "./event.js";

export {
  getServers,
  addServer,
  removeServer,
  getUserStore,
  getDeviceStore,
  on,
};

// 添加 tabSessionID
export const tabSessionid = Math.random().toString(36).slice(2);

export const init = async () => {
  await getServers(); // 获取服务器列表，可以连接握手服务器
  await getDeviceStore();
};
