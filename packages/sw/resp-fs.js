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
    pathArr[2] === "app"
  ) {
    return resposeApp({ pathname });
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
const resposeApp = async ({ pathname }) => {

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Setting App</title>
    <script src="/packages/ofa.js" debug></script>
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
    <o-app src="./app-config.js"></o-app>
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
