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

// 填充应用数据
systemApps.forEach(async (item) => {
  const appUrlObj = new URL(item.path, selfPath);
  const homeAppData = await import(appUrlObj.href);

  item.icon = new URL(homeAppData.icon, appUrlObj).href;
  item.name = homeAppData.name;
});

export const installedApps = $.stanz([]);
