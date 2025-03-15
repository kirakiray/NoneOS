import { getFullAppData, getApps } from "./app.js";

export const openApp = async ({ appConfigUrl, filepath, noneos }) => {
  if (!appConfigUrl) {
    // 尝试查找默认程序
    const suffix = filepath.split(".").slice(-1)[0];

    const apps = await getApps();

    apps.some((e) => {
      const { appData, configUrl } = e;

      if (appData.accept && appData.accept.includes(suffix)) {
        appConfigUrl = configUrl;
        return true;
      }
    });

    // 最后还是没有
    if (!appConfigUrl) {
      return false;
    }
  }

  const data = await getFullAppData(
    appConfigUrl.replace(/\/app-config\.js$/, "")
  );

  const exitedBarApp = await runApp({ data, noneos });

  if (filepath) {
    setTimeout(async () => {
      const appFrameEle = noneos.shadow.$(
        `n-app-frame[data-appid="${exitedBarApp.appid}"]`
      );

      const appEl = appFrameEle.$("o-app");

      await appEl.watchUntil(() => appEl.appIsReady);

      const moduleData = appEl._module;

      if (moduleData.onHandle) {
        moduleData.onHandle.call(appEl, {
          path: filepath,
        });
      }
    }, 10);
  }

  return true;
};

// 运行app
export const runApp = async ({ data, noneos: self }) => {
  // 查找是否已经存在
  let exitedBarApp = self.barApps.find(
    (appData) => appData.configUrl === data.configUrl
  );

  if (exitedBarApp) {
    if (exitedBarApp.appStatus === "min") {
      exitedBarApp.appStatus = exitedBarApp._oldAppStatus || "normal";
    }
  } else {
    const rect = self.shadow.$(".main").ele.getBoundingClientRect();

    const box = {
      // top: 0,
      // left: 0,
      // 默认为窗口一半大小的尺寸
      width: Math.floor(rect.width * 0.75),
      height: Math.floor(rect.height * 0.75),
    };

    // 修正坐标处于正中间（添加一定的偏移）
    const offset = 100;
    box.left =
      Math.floor((rect.width - box.width) / 2) +
      Math.random() * offset -
      offset / 2;
    box.top =
      Math.floor((rect.height - box.height) / 2) +
      Math.random() * offset -
      offset / 2;

    const appid = Math.random().toString(36).slice(2);

    // 添加到应用内
    self.barApps.push({
      appid,
      icon: data.icon,
      appData: data.appData,
      configUrl: data.configUrl,
      zIndex: self.barApps.length + 1, // 当前的图层
      appStatus: "normal",
      ...box,
    });

    exitedBarApp = self.barApps.find((e) => e.appid === appid);
  }

  focusBarAppItem(exitedBarApp, self.barApps);

  return exitedBarApp;
};

// 让 bar app item 处于焦点状态
export const focusBarAppItem = function (item, barApps) {
  const topIndex = barApps.length;

  item.zIndex = topIndex + 1;

  const newBarApps = [...barApps].sort((a, b) => b.zIndex - a.zIndex);

  // 重新排序
  newBarApps.forEach((e, i) => {
    e.zIndex = topIndex - i;
  });
};
