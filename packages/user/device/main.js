import { createData } from "/packages/hybird-data/main.js";
import { get } from "/packages/fs/main.js";
import { getServers } from "../hand-server/main.js";

const stores = {};

// 获取所有设备列表
export const getDeviceStore = async (userDirName) => {
  userDirName = userDirName || "main";

  const devicesDir = await get(`system/devices/${userDirName}`, {
    create: "dir",
  });

  let deviceStorePms = null;
  if (!stores[userDirName]) {
    deviceStorePms = stores[userDirName] = createData(devicesDir);
  } else {
    deviceStorePms = stores[userDirName];
  }

  const deviceStore = await deviceStorePms;

  // 等待数据准备好
  await deviceStore.ready(true);

  return deviceStore;
};

// 添加设备
// opoUserId 对方用户id
// userDirName 当前用户目录
export const entryDevice = async (options, userDirName) => {
  const devices = await getDeviceStore(userDirName);

  const { userId, deviceCode, confirm } = options;

  // 前从服务器查找用户
  const servers = await getServers(userDirName);

  debugger;
};
