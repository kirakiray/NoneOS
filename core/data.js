export const systemApps = $.stanz([
  {
    isHome: true,
    path: "/core/apps/finder/app-config.js",
  },
  {
    path: "/core/apps/editor/app-config.js",
    suffixs: [/\.md$/, /\.txt$/],
  },
]);

const selfPath = import.meta.url;

// 填充应用数据
systemApps.forEach(async (item) => {
  const appUrlObj = new URL(item.path, selfPath);
  const homeAppData = await import(appUrlObj.href);

  item.icon = new URL(homeAppData.icon, appUrlObj).href;
  item.name = homeAppData.name;
});

export const installedApps = $.stanz([]);
