// 系统默认的apps
const defaultAppsPaths = [
  "/packages/apps/setting.napp",
  "/packages/apps/file-manager.napp",
  "/packages/apps/bookmarks.napp",
];

// 获取所有app数组
export const getApps = async () => {
  const defaults = [];
  await Promise.all(
    defaultAppsPaths.map(async (path, index) => {
      defaults[index] = await getFullAppData(path);
    })
  );

  return [...defaults];
};

// 根据路径，获取完全的数据
const getFullAppData = async (appDirPath) => {
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
