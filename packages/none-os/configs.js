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
  "/packages/apps/files",
  "/packages/apps/setting",
  "/packages/apps/link",
  "/packages/apps/picture",
];
