import { on, userMiddleware } from "../main.js";
import { getId } from "../base/pair.js";

{
  on("user-connected", async ({ data: { target } }) => {
    // 连接成功时，发送一次可访问的目录
    target.send({
      type: "obtain-accessible-directories",
      dirs: [
        {
          name: "虚拟空间",
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
