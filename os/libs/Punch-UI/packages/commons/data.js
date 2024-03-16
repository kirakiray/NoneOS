// 功用数据
export const isDark = $.stanz({
  value: localStorage.__isDark == 1,
});

function run() {
  if (isDark.value) {
    $("html").classList.add("dark");
  } else {
    $("html").classList.remove("dark");
  }
}

run();

isDark.watch(() => {
  localStorage.__isDark = isDark.value ? 1 : 0;
  run();
});
