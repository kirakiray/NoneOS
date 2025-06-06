import { getContentType, getFile } from "./util.js";
import configs from "./config.js";

export default async function resposePkg(event) {
  const { request } = event;
  const { pathname, origin, searchParams } = new URL(request.url);

  if (/\.napp\/$/.test(pathname)) {
    respNapp(event);
    return;
  }

  if (configs.packageUseOnline || configs.debugMode) {
    // console.log("package use online", pathname);
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
    if (configs.packageUseOnline || configs.debugMode) {
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

export const respNapp = async (event) => {
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
