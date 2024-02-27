import { get } from "./fs/local/main.js";
const selfPath = import.meta.url;

export const systemApps = $.stanz([
  {
    isHome: true,
    path: new URL("./apps/finder/app-config.js", selfPath).href,
  },
  {
    path: new URL("./apps/editor/app-config.js", selfPath).href,
    suffixs: [/\.md$/, /\.txt$/],
  },
]);

export const installedApps = $.stanz([]);

export const reloadAppsData = async () => {
  // 填充应用数据
  systemApps.forEach(async (item) => {
    if (!item.icon && !item.loading) {
      item.loading = 1;
      const appUrlObj = new URL(item.path, selfPath);
      const homeAppData = await import(appUrlObj.href);

      item.icon = new URL(homeAppData.icon, appUrlObj).href;
      item.name = homeAppData.name;
      delete item.loading;
    }
  });

  const appsHandle = await get("apps");

  if (appsHandle) {
    for await (let item of appsHandle.values()) {
      const path = `${location.origin}/$/apps/${item.name}/app-config.js`;

      if (!installedApps.some((e) => e.path === path)) {
        installedApps.push({
          name: item.name.split(".")[0],
          path,
          icon: "/os/core/apps/finder/icons/file.svg",
        });
      }
    }
  }
};

reloadAppsData();
