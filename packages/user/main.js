import { getServers } from "./hand-server/main.js";
import { getUserStore } from "./user-store.js";

export { getServers, getUserStore };

// 添加 tabSessionID
export const tabSessionid = Math.random().toString(36).slice(2);

// 获取我的所有设备
export const getDevices = async (userDirName) => {
  const selfUserStore = await getUserStore(userDirName);
  await selfUserStore.ready(true);

  if (!selfUserStore.devices) {
    selfUserStore.devices = [];
    await selfUserStore.devices.ready();
  }

  return selfUserStore.devices;
};
