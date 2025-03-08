import resposeFs from "./response-fs.js";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { pathname, origin, searchParams } = new URL(request.url);

  // 只处理同源的请求
  if (location.origin === origin) {
    // 请求本地文件，会$开头
    if (/^\/\$/.test(pathname)) {
      resposeFs(event);
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
