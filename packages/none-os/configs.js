// 系统的配置数据
export const configs = $.stanz(
  localStorage._nconfig
    ? JSON.parse(localStorage._nconfig)
    : {
        barDirection: "left", // 应用栏的方向
      }
);

configs.watchTick(() => {
  localStorage._nconfig = JSON.stringify(configs);
});

// 默认应用
export const defaultApps = [
  "/packages/apps/link-me.napp",
  "/packages/apps/setting.napp",
  // "/packages/apps/bookmarks.napp",
  "/packages/apps/files.napp",
  "/packages/apps/text-edit.napp",
  "/packages/apps/picture.napp",
  "/packages/apps/link.napp",
];
