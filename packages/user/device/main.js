import { createData } from "/packages/hybird-data/main.js";
import { get } from "/packages/fs/main.js";
import { getServers } from "../hand-server/main.js";
import { on } from "../event.js";

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
// deviceCode 设备码
// confirm 确认信息
// userDirName 当前用户目录
export const entryDevice = async ({ deviceCode, confirm }, userDirName) => {
  const devices = await getDeviceStore(userDirName);

  // 前从服务器查找用户
  const servers = await getServers(userDirName);

  // 等待服务器准备完成
  await servers.watchUntil(
    () => servers.every((server) => server.initialized),
    10000
  );

  // 向所有服务器发送

  debugger;
};

// 有用户向你发送添加请求
// deviceCode 设备码
// confirm 确认信息
export const onEntryDevice = async ({ deviceCode, confirm }, userDirName) => {
  return on("server-agent-data", (e) => {
    debugger;
  });
};
