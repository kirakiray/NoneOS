(function () {
  'use strict';

  // 读取文件
  const getFile = async (filepath) => {
    const opfsRoot = await navigator.storage.getDirectory();

    const paths = filepath.split("/");
    let currentPath = "";
    let currentDir = opfsRoot;
    while (paths.length > 1) {
      const dirName = paths.shift();
      currentPath += `${dirName}/`;
      const dirHandle = await currentDir
        .getDirectoryHandle(dirName)
        .catch(() => null);
      if (!dirHandle) {
        throw new Error(`目录 ${currentPath} 不存在`);
      }
      currentDir = dirHandle;
    }
    // 获取文件
    const fileHandle = await currentDir.getFileHandle(paths[0]).catch(() => null);

    if (!fileHandle) {
      throw new Error(`文件 ${filepath} 不存在`);
    }

    return fileHandle;
  };

  const getContentType = (prefix) => {
    switch (prefix) {
      case "html":
      case "htm":
      case "txt":
      case "md":
        return "text/plain; charset=utf-8";
      case "js":
      case "mjs":
        return "application/javascript; charset=utf-8";
      case "json":
        return "application/json; charset=utf-8";
      case "css":
        return "text/css; charset=utf-8";
      case "xml":
        return "application/xml; charset=utf-8";
      case "svg":
        return "image/svg+xml; charset=utf-8";
      case "csv":
        return "text/csv; charset=utf-8";
      case "ics":
        return "text/calendar; charset=utf-8";
      case "pdf":
        return "application/pdf; charset=utf-8";
      case "doc":
      case "docx":
        return "application/msword; charset=utf-8";
      case "xls":
      case "xlsx":
        return "application/vnd.ms-excel; charset=utf-8";
      case "ppt":
      case "pptx":
        return "application/vnd.ms-powerpoint; charset=utf-8";
      case "zip":
        return "application/zip; charset=utf-8";
      case "gz":
        return "application/gzip; charset=utf-8";
      case "tar":
        return "application/x-tar; charset=utf-8";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "bmp":
        return "image/bmp";
      case "ico":
        return "image/x-icon";
      case "webp":
        return "image/webp";
      case "bmp":
        return "image/bmp";
      case "mp3":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "mp4":
      case "m4v":
        return "video/mp4";
      case "mov":
        return "video/quicktime";
      case "avi":
        return "video/x-msvideo";
      default:
        return "application/octet-stream";
    }
  };

  // 响应文件相关的请求
  const resposeFs = (event) => {
    const { request } = event;
    let { pathname, origin, searchParams } = new URL(request.url);
    pathname = decodeURIComponent(pathname);

    const paths = pathname.split("/");
    const filepath = [paths[1].replace("$", ""), ...paths.slice(2)].join("/");

    // 改用直接的 opfs 读取文件方法
    event.respondWith(
      (async () => {
        try {
          // 获取文件
          const fileHandle = await getFile(filepath);

          const prefix = pathname.split(".").pop();

          return new Response(await fileHandle.getFile(), {
            status: 200,
            headers: {
              "Content-Type": getContentType(prefix),
            },
          });
        } catch (err) {
          return new Response(err.stack || err.toString(), {
            status: 400,
          });
        }
      })()
    );
  };

  const configs = {
    packageUseOnline: false, // 包是否使用在线文件
  };

  async function resposePkg(event) {
    const { request } = event;
    const { pathname, origin, searchParams } = new URL(request.url);

    if (/\.napp\/$/.test(pathname)) {
      respNapp(event);
      return;
    }

    if (configs.packageUseOnline) {
      console.log("package use online", pathname);
      return;
    }

    // 尝试从本地获取
    event.respondWith(
      (async () => {
        const file = await getFileWithPkg(pathname);
        const prefix = pathname.split(".").pop();

        return new Response(file, {
          status: 200,
          headers: {
            "Content-Type": getContentType(prefix),
          },
        });
      })()
    );
  }

  const getFileWithPkg = async (pathname) => {
    pathname = pathname.replace(/^\//, "");
    let file;
    try {
      if (configs.packageUseOnline) {
        throw new Error("");
      }
      // 先尝试本地的，如果本地没有，再从网络获取
      file = await getFile(pathname);
      file = await file.getFile();
    } catch (e) {
      file = await fetch(pathname).then((e) => e.blob());
    }
    return file;
  };

  const respNapp = async (event) => {
    const { request } = event;
    const { pathname, origin, searchParams } = new URL(request.url);

    let iconName = "icon.svg";

    event.respondWith(
      (async () => {
        // 获取应用名
        let appName = "App";
        try {
          const appFile = await getFileWithPkg(`${pathname}app.json`);
          let appData = await appFile.text();
          appData = JSON.parse(appData);

          iconName = appData.icon || iconName;

          appName =
            appData.name ||
            pathname
              .split("/")
              .filter((e) => /\.napp$/.test(e))
              .slice(-1)[0]
              .replace(/\.napp$/, "");
        } catch (e) {}

        const content = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
    <link rel="icon" href="./${iconName}">
    <link rel="stylesheet" href="/packages/others/colors.css" pui-colors />
    <script src="/packages/libs/ofa/ofa.js#debug"></script>
    <script src="/packages/libs/ofa/router.min.js"></script>
    <script src="/packages/pui/public/init.js" type="module"></script>
    <script src="/packages/none-os/init.js" type="module"></script>
    <style>
      body{
        background-color: var(--md-sys-color-surface);
        color: var(--md-sys-color-on-surface);
      }

      body {
        font: 400 1em/1.8 -apple-system, BlinkMacSystemFont, Segoe UI,
          Microsoft Yahei, Helvetica, Arial, sans-serif, Apple Color Emoji,
          Segoe UI Emoji;
      }
    </style>
  </head>
  <body>
    <o-router fix-body>
      <o-app src="./app-config.js"></o-app>
    </o-router>
  </body>
</html>`;

        return new Response(content, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        });
      })()
    );
  };

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
        resposePkg(event);
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

})();
