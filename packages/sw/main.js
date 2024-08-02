/**
 * BUG: 😒 在 chrome 下，只更新这个文件的话，service worker 会一直处于 waiting 状态，导致更新不生效
 * 查明只会在chrome会出现这个问题，调试的时候请主动刷新 service woker
 */

import resposeFS from "./resp-fs.js";
import { cacheResponse } from "./util.js";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { pathname, origin } = new URL(request.url);

  if (location.origin === origin) {
    if (pathname === "/" || pathname === "/index.html") {
      event.respondWith(cacheResponse(pathname));
    } else if (/^\/\$/.test(pathname)) {
      event.respondWith(
        (async () => {
          try {
            return await resposeFS({ request });
          } catch (err) {
            console.error(err);
            return new Response(err.stack || err.toString(), {
              status: 404,
            });
          }
        })()
      );
    } else if (/^\/packages\//.test(pathname)) {
      event.respondWith(
        (async () => {
          try {
            // 转发代理本地packages文件
            return await resposeFS({
              request: {
                url: `${origin}/$${pathname}`,
              },
            });
          } catch (err) {
            // 本地请求失败，则请求线上
            return fetch(request.url);
          }
        })()
      );
    }
  }
});

self.addEventListener("install", () => {
  self.skipWaiting();
  console.log("NoneOS installation successful");
});

self.addEventListener("activate", () => {
  self.clients.claim();
  console.log("NoneOS server activation successful");
});
