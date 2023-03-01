importScripts("system/fs/fs.js");

self.addEventListener("fetch", function (event) {
  const { request } = event;

  const urldata = new URL(request.url);

  // 修正虚拟目录
  if (/^\/\$/.test(urldata.pathname)) {
    const realUrl = urldata.pathname.replace(/\/\$/, "");
    if (realUrl) {
      event.respondWith(
        (async () => {
          try {
            const data = await fs.read(realUrl);

            return new Response(data.content, {
              status: 200,
            });
          } catch (e) {
            return new Response(undefined, {
              status: 404,
            });
          }
        })()
      );
    }
  }
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
