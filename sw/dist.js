(function () {
  'use strict';

  // 响应文件相关的请求
  const resposeFs = (event) => {
    const { request } = event;
    const { pathname, origin, searchParams } = new URL(request.url);

    const paths = pathname.split("/");
    const filepath = [paths[1].replace("$", ""), ...paths.slice(2)].join("/");

    // 改用直接的 opfs 读取文件方法
    event.respondWith(
      (async () => {
        try {
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
          const fileHandle = await currentDir
            .getFileHandle(paths[0])
            .catch(() => null);

          if (!fileHandle) {
            throw new Error(`文件 ${filepath} 不存在`);
          }

          const prefix = pathname.split(".").pop();

          const headers = {};
          headers["Content-Type"] = getContentType(prefix);

          return new Response(await fileHandle.getFile(), {
            status: 200,
            headers,
          });
        } catch (err) {
          return new Response(err.stack || err.toString(), {
            status: 400,
          });
        }
      })()
    );
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

  async function resposePkg(event) {
    const { request } = event;
    const { pathname, origin, searchParams } = new URL(request.url);

    if (/\.napp\/$/.test(pathname)) {
      respNapp(event);
      return;
    }
  }

  const respNapp = async (event) => {
    const { request } = event;
    const { pathname, origin, searchParams } = new URL(request.url);

    event.respondWith(
      (async () => {
        // 获取应用名
        let appName = "App";
        try {
          const appData = await fetch(`${pathname}app.json`).then((e) =>
            e.json()
          );

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
    <script src="/packages/libs/ofa/ofa.js"></script>
    <script src="/packages/libs/ofa/router.min.js"></script>
    <script src="/packages/pui/public/init.js" type="module"></script>
    <script src="/packages/none-os/init.js" type="module"></script>
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
      } else if (/^\/packages/.test(pathname)) {
        // 访问包目录
        resposePkg(event);
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

})();
