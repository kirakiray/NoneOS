// 保持和system同目录，才能启用noneos总代理
import fs, { read } from "/system/fs/fs.mjs";

self.addEventListener("fetch", function (event) {
  const { request } = event;

  const urldata = new URL(request.url);

  // 修正虚拟目录
  if (/^\/\$/.test(urldata.pathname)) {
    const realUrl = urldata.pathname.replace(/\/\$/, "");
    if (realUrl) {
      event.respondWith(
        (async () => {
          await fs.inited;

          try {
            const data = await read(realUrl);

            const headers = data.options ? data.options.headers : {};

            return new Response(data.content, {
              status: 200,
              headers,
            });
          } catch (e) {
            console.error(e);
            return new Response(undefined, {
              status: 404,
            });
          }
        })()
      );
    }
  }
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
