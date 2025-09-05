import { get, init } from "/packages/fs/main.js";
import { createData } from "/packages/hybird-data/main.js";

// 主体对象promise
let mainDataPms;

// 获取系统配置对象
export const getSetting = async () => {
  if (mainDataPms) {
    return mainDataPms;
  }

  mainDataPms = (async () => {
    await init("system");

    // 判断是否有旧的数据
    const oldSettingDataDir = await get("system/setting");

    const settingData = await createData(
      await get("system/setting.json", {
        create: "file",
      })
    );

    if (oldSettingDataDir) {
      // 替换旧版本的数据
      // 创造主体数据对象
      const oldSettingData = await createData(oldSettingDataDir);

      await oldSettingData.ready(true);

      // 合并到新对象
      Object.assign(settingData, oldSettingData.toJSON());

      // 删除旧的数据文件夹
      await oldSettingData.disconnect();

      await oldSettingDataDir.remove();
    }

    // 如果没有初始化数据，直接添加初始化数据
    if (!settingData.lang) {
      let lang = "en";

      // 根据本地语言，进行修正
      if (navigator.language.toLowerCase().includes("zh")) {
        lang = "cn";
      } else if (navigator.language.toLowerCase().includes("ja")) {
        lang = "ja";
      }

      Object.assign(settingData, {
        lang, // 系统默认语言
        dockDirection: "auto", // 程序坞方向
        theme: "auto", // 系统主题
      });
    }

    return settingData;
  })();

  return mainDataPms;
};
