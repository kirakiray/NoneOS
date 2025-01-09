import { on, userMiddleware } from "../main.js";
import { getId } from "../base/pair.js";
import { getText, setSpace } from "/packages/i18n/data.js";

{
  on("user-connected", async ({ data: { target } }) => {
    await setSpace(
      "files",
      new URL("/packages/apps/files/lang", location.href).href
    );

    // 连接成功时，发送一次可访问的目录
    target.send({
      type: "obtain-accessible-directories",
      dirs: [
        {
          name: getText("virLocal", "files"),
          path: `$remote:${await getId()}:local`,
        },
      ],
    });
  });
}

// 接收到获取证书的请求
userMiddleware.set("obtain-accessible-directories", async (midData, client) => {
  client.accessibleDirs = midData.dirs;
});
