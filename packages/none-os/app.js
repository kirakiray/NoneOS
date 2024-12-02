import { get } from "../fs/main.js";
import { defaultApps } from "./configs.js";
import { alert } from "/packages/pui/util.js";

// 获取所有可用的应用数据
export const getApps = async () => {
  const appHandle = await get("apps");

  // 获取默认应用信息
  const apps = await Promise.all(defaultApps.map(getAppBase));

  for await (let handle of appHandle.values()) {
    const data = await getAppBase(`/$/${handle.path}`);

    if (data) {
      data.__not_default = 1; // 标识不是默认应用
      apps.push(data);
    }
  }

  return apps;
};

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
      configData,
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
export const openFileWithApp = async ({ path, core }) => {
  const handle = await get(path);
  const appsData = await getApps();

  if (handle) {
    // 获取文件后缀
    const sarr = path.match(/.+\.(.+)$/);
    if (sarr) {
      const type = sarr[1];

      for (let app of appsData) {
        if (app.configData?.accept?.includes(type)) {
          // TODO: 打开应用程序
          const barData = core.runApp({
            data: {
              name: app.name,
              icon: app.icon,
              url: app.url,
            },
          });

          await new Promise((res) => {
            setTimeout(async () => {
              const targetApp = core.shadow.$(
                `o-app[data-appid="${barData.appid}"]`
              );

              if (targetApp) {
                await targetApp.watchUntil(() => !!targetApp._module);

                if (targetApp._module.onHandle) {
                  targetApp._module.onHandle.call(targetApp, { handle, path });
                }
              }
              res();
            }, 100);
          });

          return true;
        }
      }

      const surfix = handle.name.replace(/.+\.(.+)/, "$1");

      // TODO: 没有该后缀的应用程序
      alert({
        title: `无法打开${surfix || ""}`,
        content: `没有可以打开 ${handle.name} 的应用程`,
      });
    } else {
      // TODO: 没有后缀的情况，弹床显示打开的默认程序
      debugger;
    }
  } else {
    // TODO: 已经删除了
    debugger;
  }
};
