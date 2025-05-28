import resposeFs from "./response-fs.js";
import responsePkg from "./response-pkg.js";
import configs from "./config.js";
import { getFile } from "./util.js";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { pathname, origin, searchParams } = new URL(request.url);

  // 只处理同源的请求
  if (location.origin === origin) {
    // 请求本地文件，会$开头
    if (/^\/\$/.test(pathname)) {
      resposeFs(event);
    } else if (!configs.packageUseOnline && /^\/packages/.test(pathname)) {
      // 访问包目录
      responsePkg(event);
    }
  }

  if (!configs.packageUseOnline && pathname === "/") {
    // 尝试从packages中获取index.html
    event.respondWith(
      (async () => {
        try {
          // 获取文件
          const fileHandle = await getFile("packages/index.html");

          if (fileHandle) {
            // 优先使用本地文件
            return new Response(await fileHandle.getFile(), {
              headers: {
                "Content-Type": "text/html;charset=utf-8",
              },
            });
          }
        } catch (err) {
          console.error(err);
        }

        // 直接返回index.html
        return fetch(request);
      })()
    );
  }

  if (pathname === "/package-use-online") {
    // 3秒内packages的请求使用在线的模式
    clearTimeout(packageUseOnlineTimer);
    configs.packageUseOnline = true;
    event.respondWith(new Response("package use online"));
    packageUseOnlineTimer = setTimeout(() => {
      configs.packageUseOnline = false;
    }, 3000);
  } else if (pathname === "/package-use-local") {
    // 直接关闭packages默认使用在线的模式
    clearTimeout(packageUseOnlineTimer);
    configs.packageUseOnline = false;
    event.respondWith(new Response("package use local"));
  }
});

let packageUseOnlineTimer;

self.addEventListener("install", () => {
  self.skipWaiting();
  console.log("NoneOS installation successful");
});

self.addEventListener("activate", () => {
  self.clients.claim();
  console.log("NoneOS server activation successful");
});
