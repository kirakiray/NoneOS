import { get } from "./core/fs/main.js";

self.addEventListener("fetch", async (event) => {
  const { request } = event;
  const { url } = request;
  const urlObj = new URL(url);
  const { pathname } = urlObj;

  // 属于$的进入虚拟空间获取数据
  if (/^\/\$/.test(pathname)) {
    event.respondWith(
      (async () => {
        const pathArr = pathname.split("/");

        const all = await getAll();

        console.log("all", all);

        try {
          const handle = await get(
            decodeURIComponent(pathArr.slice(2).join("/"))
          );
          const file = await handle.file();

          return new Response(file, {
            status: 200,
          });
        } catch (err) {
          console.error(err);
          return new Response(undefined, {
            status: 404,
          });
        }
      })()
    );
  }
});

self.addEventListener("install", () => {
  self.skipWaiting();

  console.log("NoneOS installation successful");
});

self.addEventListener("activate", () => {
  console.log("NoneOS server activation successful");
});
