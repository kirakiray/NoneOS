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
