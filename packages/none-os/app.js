import { get } from "../fs/main.js";

// 获取应用的配置数据
export const getAppBase = async (path) => {
  try {
    const appJsonPath = `${path}/app.json`;
    const configData = await fetch(appJsonPath).then((e) => e.json());

    const icon = getRelatePath(appJsonPath, configData.icon);
    let configUrl;

    if (configData.config) {
      configUrl = getRelatePath(appJsonPath, configData.config);
    }

    return {
      name: configData.name,
      icon: {
        url: icon,
      },
      url: configUrl || `${path}/app-config.js`,
    };
  } catch (err) {
    console.error(err);
  }
};

// 获取相对路径
function getRelatePath(basePath, relativePath) {
  const baseUrl = new URL(basePath, window.location.href);
  const resolvedUrl = new URL(relativePath, baseUrl);
  return resolvedUrl.pathname;
}

// 根据文件路径，使用应用程序打开文件
export const openApp = async ({ path, core }) => {
  const handle = await get(path);

  if (handle) {
    // 获取文件后缀
    const sarr = handle.path.match(/.+\.(.+)$/);
    if (sarr) {
      const type = sarr[1];

      if (type === "png" || type === "jpg") {
        debugger;

        return;
      }

      // TODO: 其他应用程序
      debugger;
    } else {
      // TODO: 没有后缀的情况，弹床显示打开的默认程序
      debugger;
    }
  } else {
    // TODO: 已经删除了
    debugger;
  }
};
