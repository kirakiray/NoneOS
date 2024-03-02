import { get } from "./os/core/fs/local/main.js";
import { remotes } from "./os/core/fs/remote/data.js";
import virtual from "./sw/virtual-sw.js";

self.addEventListener("fetch", async (event) => {
  const { request } = event;
  const { url } = request;
  const urlObj = new URL(url);
  const { pathname } = urlObj;

  if (/^\/v\//.test(pathname)) {
    // 进入虚拟地址
    event.respondWith(virtual({ pathname, request }));
  } else if (
    pathname === "/" ||
    pathname === "/index.html" ||
    pathname === "/main-init.js"
  ) {
    event.respondWith(
      fetch(pathname).catch(async () => {
        const cache = await caches.open("noneos-bootstrap");

        return cache.match(pathname);
      })
    );
  } else if (/^\/\$/.test(pathname)) {
    // 属于$的进入虚拟空间获取数据
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

          const file = await handle.file();

          const headers = {};

          const { pathname } = new URL(request.url);

          [
            ["js", "application/javascript;charset=utf-8"],
            ["json", "application/json;charset=utf-8"],
            ["svg", "image/svg+xml"],
          ].some(([str, ct]) => {
            const reg = new RegExp(`\.${str}$`);
            if (reg.test(pathname)) {
              headers["Content-Type"] = ct;
              return true;
            }
          });

          return new Response(file, {
            status: 200,
            headers,
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
