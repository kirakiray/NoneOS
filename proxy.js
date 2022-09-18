self.addEventListener("fetch", function (event) {
  const { request } = event;

  const urldata = new URL(request.url);

  // console.log("urldata => ", urldata);
});

self.addEventListener("install", () => {
  // 不执行这个操作的话，就要当前应用所有页面都关闭后，才能更新
  self.skipWaiting();

  // 安装回调的逻辑处理
  console.log("NoneOS installation successful");
});

self.addEventListener("activate", () => {
  // 激活回调的逻辑处理
  console.log("NoneOS server activation successful");
});
