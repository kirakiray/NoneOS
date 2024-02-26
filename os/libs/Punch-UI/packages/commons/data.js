// 功用数据
export const isDark = $.stanz({
  value: localStorage.__isDark == 1,
});

isDark.watch(() => {
  localStorage.__isDark = isDark.value ? 1 : 0;
});
