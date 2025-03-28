import { getUserStore } from "../user-store.js";

// 获取所有设备列表
export const getDevices = async (userDirName) => {
  const selfUserStore = await getUserStore(userDirName);
  await selfUserStore.ready(true);

  if (!selfUserStore.devices) {
    selfUserStore.devices = [];
    await selfUserStore.devices.ready();
  }

  return selfUserStore.devices;
};
