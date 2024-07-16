/**
 * BUG: 😒 在 chrome 下，只更新这个文件的话，service worker 会一直处于 waiting 状态，导致更新不生效
 * 查明只会在chrome会出现这个问题，调试的时候请主动刷新 service woker
 */

import resposeFS from "./resp-fs.js";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { pathname } = new URL(request.url);

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
