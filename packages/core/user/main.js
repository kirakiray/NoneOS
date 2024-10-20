import { servers } from "../server-connect/main.js";
import { UserClient } from "./user.js";
import { getSelfUserInfo } from "/packages/user/main.js";

export const users = $.stanz([]); // 所有的用户

// 更新在线用户
export const updateOnlineUser = async () => {
  const selfUserInfo = await getSelfUserInfo();

  // 通过服务器获取在线用户
  servers.forEach(async (server) => {
    const result = await server
      ._post({
        recommends: 1, // 获取推荐用户的参数
      })
      .then((e) => e.json());

    if (result.ok) {
      const { data } = result;

      data.forEach(async (userData) => {
        const client = new UserClient(userData);
        const isVerify = await client.verify();

        // 过滤自己的卡片
        if (selfUserInfo.userID === client.userId) {
          return;
        }

        if (isVerify) {
          // 确认没被擅改过的用户数据
          users.push(client);
        } else {
          // 擅改过的用户进行警报
          debugger;
        }
      });
    } else {
      // 服务器返回数据不成功的警报
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
