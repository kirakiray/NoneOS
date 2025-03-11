// 系统默认的apps
const defaultAppsPaths = ["/packages/apps/bookmarks.napp"];

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
  const configUrl = `${appDirPath}/app.json`;
  const configData = await fetch(configUrl).then((e) => e.json());

  const iconUrlObj = new URL(
    configData.icon,
    new URL(configUrl, location.href)
  );

  return {
    icon: {
      url: iconUrlObj.href,
    },
    configUrl,
    configData,
  };
};
