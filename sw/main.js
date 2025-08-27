import resposeFs from "./response-fs.js";
import responsePkg from "./response-pkg.js";
import configs from "./config.js";
import { getFile, getContentType } from "./util.js";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { pathname, origin, searchParams } = new URL(request.url);

  if (configs.debugMode) {
    if (/^\/\$local/.test(pathname)) {
      // TODO: 这是一个临时方案，后期要替换到容器上去运行
      event.respondWith(
        (async () => {
          // 获取文件
          const fileHandle = await getFile(
            pathname.replace(/^\/\$local/, "local")
          );
          const prefix = pathname.split(".").pop();

          if (fileHandle) {
            if (prefix === "html") {
              return new Response(await fileHandle.getFile(), {
                headers: {
                  "Content-Type": "text/html;charset=utf-8",
                },
              });
            }
            // 优先使用本地文件
            return new Response(await fileHandle.getFile(), {
              headers: {
                "Content-Type": getContentType(prefix),
              },
            });
          }
        })()
      );
      return;
    }
  }

  // 只处理同源的请求
  if (location.origin === origin) {
    // 请求本地文件，会$开头
    if (/^\/\$/.test(pathname)) {
      resposeFs(event);
    } else if (/^\/packages/.test(pathname)) {
      // 访问包目录
      responsePkg(event);
    }
  }

  if (pathname === "/" && !configs.packageUseOnline && !configs.debugMode) {
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
  } else if (pathname === "/open-debug-mode") {
    // 打开调试模式
    configs.debugMode = true;
    event.respondWith(new Response("debug mode open"));
  } else if (pathname === "/close-debug-mode") {
    // 关闭调试模式
    configs.debugMode = false;
    event.respondWith(new Response("debug mode close"));
  } else if (pathname === "/get-configs") {
    // 获取配置
    event.respondWith(new Response(JSON.stringify(configs)));
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
