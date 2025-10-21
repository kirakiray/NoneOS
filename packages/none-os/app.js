import { get } from "../fs/main.js";

// 系统默认的apps
const defaultAppsPaths = [
  "/packages/apps/setting.napp",
  "/packages/apps/file-manager.napp",
  // "/packages/apps/link-me.napp",
  "/packages/apps/new-link-me.napp",
  "/packages/apps/luminote.napp",
  "/packages/apps/flask-genie.napp",
  "/packages/apps/bookmarks.napp",
  "/packages/apps/text-edit.napp",
  "/packages/apps/picture.napp",
];

// 获取所有app数组
export const getApps = async () => {
  const defaults = [];

  await Promise.all(
    defaultAppsPaths.map(async (path, index) => {
      defaults[index] = await getFullAppData(path);
    })
  );

  // 查看 apps 目录
  const appsDir = await get("apps");
  if (appsDir) {
    for await (let appDir of appsDir.values()) {
      if (appDir.kind !== "dir") {
        continue;
      }

      try {
        const appFullData = await getFullAppData(`/$apps/${appDir.name}`);

        defaults.push(appFullData);
      } catch (err) {
        console.warn(`"/$apps/${appDir.name}" 不是应用`);
      }
    }
  }

  return [...defaults];
};

// 根据路径，获取完全的数据
export const getFullAppData = async (appDirPath) => {
  const appJsonUrl = `${appDirPath}/app.json`;
  const configUrl = `${appDirPath}/app-config.js`;
  const appData = await fetch(`${appDirPath}/app.json`).then((e) => e.json());

  const iconUrlObj = new URL(appData.icon, new URL(appJsonUrl, location.href));

  return {
    icon: {
      url: iconUrlObj.href,
    },
    configUrl,
    appData,
  };
};
