import { on, userMiddleware } from "../main.js";
import { getId } from "../base/pair.js";
import { getText, setSpace } from "/packages/i18n/data.js";
import { getMyDeviceCerts } from "../cert/main.js";
import { connectUser } from "../user-connect/main.js";

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

setTimeout(async () => {
  // 自动连接我的设备
  const devices = await getMyDeviceCerts();

  devices.forEach(({ userId }) => {
    connectUser({ userId });
  });
}, 500);
