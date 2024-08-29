import get from "../fs/get.js";
import { getContentType } from "./util.js";

const resposeFS = async ({ request }) => {
  const { pathname } = new URL(request.url);

  const path = decodeURIComponent(pathname.replace(/^\/\$\//, ""));

  // 判断是不是app入口
  const pathArr = path.split("/");

  if (
    pathArr.length === 3 &&
    (pathArr[0] === "apps" || pathArr[0] === "packages") &&
    (pathArr[2] === "app" || pathArr[2] === "appdebug")
  ) {
    return resposeApp({ pathname, path });
  }

  // console.log("path:", path);
  const handle = await get(path);
  let content = await handle.file();

  const headers = {};

  const prefix = path.split(".").pop();

  if (
    /^\/\$\/apps\//.test(pathname) &&
    prefix === "html" &&
    handle.name === "index.html"
  ) {
    // apps目录放权
    headers["Content-Type"] = "text/html; charset=utf-8";
  } else {
    headers["Content-Type"] = getContentType(prefix);
  }

  return new Response(content, {
    status: 200,
    headers,
  });
};

// 以app入口的形式返回内容
const resposeApp = async ({ pathname, path }) => {
  let appconfig;

  // 获取父路径
  const pathArr = path.split("/");
  const parentPath = pathArr.slice(0, -1).join("/");

  const isdebug = pathArr.slice(-1)[0] === "appdebug";

  try {
    appconfig = await get(`${parentPath}/app.json`);
    appconfig = JSON.parse(await appconfig.text());
  } catch (err) {
    appconfig = await fetch(`/${parentPath}/app.json`).then((e) => e.json());
  }

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
    <title>${appconfig.name}</title>
    <link rel="shortcut icon" href="${appconfig.icon}">
    <script src="/packages/ofa/ofa.js"${isdebug ? " debug" : ""}></script>
    <script src="/packages/ofa/router.min.js"></script>
    <script src="/packages/pui/init.js" type="module"></script>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
      }

      o-app {
        height: 100%;
      }
    </style>
  </head>
  <body>
    <o-router fix-body>
      <o-app src="${appconfig.config}"></o-app>
    </o-router>
    <o-root-provider name="pui" theme="dark"></o-root-provider>
    <o-root-provider name="clipboard" type="no"></o-root-provider>
  </body>
</html>
    `,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
};

export default resposeFS;
