/**
 * BUG: 😒 在 chrome 下，只更新这个文件的话，service worker 会一直处于 waiting 状态，导致更新不生效
 * 查明只会在chrome会出现这个问题，调试的时候请主动刷新 service woker
 */

import resposeFS from "./resp-fs.js";
import { cacheResponse } from "./util.js";
import { storage } from "../libs/ever-cache/main.js";

let useOnline, uTime;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { pathname, origin } = new URL(request.url);

  if (!uTime) {
    uTime = Date.now();
  }

  if (location.origin === origin) {
    if (pathname === "/refresh-use-online") {
      event.respondWith(
        (async () => {
          useOnline = !!(await storage.getItem("use-online"));
          return new Response(useOnline.toString(), {
            status: 200,
          });
        })()
      );
      return;
    }

    if (pathname === "/" || pathname === "/index.html") {
      event.respondWith(cacheResponse(pathname));
      return;
    }

    if (/^\/\$/.test(pathname)) {
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
      return;
    }

    if (/^\/packages\//.test(pathname)) {
      event.respondWith(
        (async () => {
          if (Date.now() - uTime > 5000) {
            useOnline = !!(await storage.getItem("use-online"));
          }

          if (useOnline) {
            return fetch(request.url);
          }

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
      return;
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
