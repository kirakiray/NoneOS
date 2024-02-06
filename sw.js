import { get, getAll } from "./core/fs/main.js";
import { remotes } from "./core/fs/remote/data.js";

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

        try {
          let handle;

          if (pathArr[1].length > 1) {
            // 虚拟本地目录
            let rootname = pathArr[1].replace(/^\$/, "");
            rootname = decodeURIComponent(rootname);

            let targetHandle;
            remotes.some((e) => {
              e.others.some((item) => {
                if (item.name === rootname) {
                  targetHandle = item;
                }
              });
            });

            if (targetHandle) {
              handle = await targetHandle.get(
                decodeURIComponent(pathArr.slice(2).join("/"))
              );
            }
          } else {
            handle = await get(decodeURIComponent(pathArr.slice(2).join("/")));
          }

          console.log("sw", request);

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
