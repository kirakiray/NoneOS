import { servers, users } from "../main.js";
import { UserClient } from "./user-client.js";
import { getId } from "../base/pair.js";
import "../server-connect/main.js";

export { users };

// 更新在线用户
export const updateOnlineUser = async () => {
  const selfUserId = await getId();

  // 通过服务器获取在线用户
  servers.forEach(async (server) => {
    const result = await server
      ._post({
        recommends: 1, // 获取推荐用户的参数
      })
      .then((e) => e.json());

    if (result.ok) {
      const { data } = result;

      if (data.length > 10) {
        // TODO: 推荐大于10个需要报警
        debugger;
      }

      data.forEach(async (userData) => {
        const client = new UserClient(userData);
        const isVerify = await client.verify();

        // 过滤自己的卡片
        if (selfUserId === client.userId) {
          return;
        }

        // 如果已经存在，则不添加
        if (users.some((user) => user.userId === client.userId)) {
          return;
        }

        if (isVerify) {
          // 确认没被擅改过的用户数据
          users.push(client);
        } else {
          // TODO: 擅改过的用户进行警报
          debugger;
        }
      });
    } else {
      // TODO: 服务器返回数据不成功的警报
      debugger;
    }
  });
};

let oldServerLen = 0; // 旧servers长度记录
servers.watchTick(() => {
  if (servers.length > oldServerLen) {
    oldServerLen = servers.length;
    updateOnlineUser();
  }
});
