self.addEventListener("fetch", function (event) {
  let { request } = event;

  // console.log("request => ", request);
});

// 这个sw.js有更新的时候，触发这个事件
self.addEventListener("install", () => {
  // 跳过等待
  // 不执行这个操作，就要当前应用所有页面都关闭后，才能更新
  self.skipWaiting();

  // 安装回调的逻辑处理
  console.log("NoneOS 安装成功");
});

self.addEventListener("activate", () => {
  // 激活回调的逻辑处理
  console.log("NoneOS server 激活成功");
});
