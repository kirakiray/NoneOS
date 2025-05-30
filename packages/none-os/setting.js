import { get, init } from "/packages/fs/main.js";
import { createData } from "/packages/hybird-data/main.js";

await init("system");

// 创造主体数据对象
const settingData = await createData(
  await get("system/setting", {
    create: "dir",
  })
);

window.settingData = settingData;

// 添加初始化数据
const settingInitedPms = settingData.ready().then(() => {
  // 如果没有初始化数据，直接添加初始化数据
  if (!settingData.lang) {
    Object.assign(settingData, {
      lang: "en", // 系统默认语言
      dockDirection: "auto", // 程序坞方向
      theme: "auto", // 系统主题
    });
  }

  return settingData;
});

// 获取系统配置对象
export const getSetting = async () => {
  await settingInitedPms;

  return settingData;
};
