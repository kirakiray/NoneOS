import { servers, users } from "../main.js";
import { UserClient } from "./user-client.js";
import { getId } from "../base/pair.js";
import { get } from "/packages/fs/handle/index.js";
import { verify } from "../base/verify.js";

export { users };

export const inited = (async () => {
  // 加载收藏中的用户
  const cardsDir = await get("local/system/user/cards");

  if (!cardsDir) {
    return;
  }

  await Promise.all(
    cardsDir.map(async (handle) => {
      let data = await handle.text();
      if (data) {
        data = JSON.parse(data);

        const client = new UserClient(data);

        if (await client.verify()) {
          users.push(client);
        }
      }
    })
  );
})();

// 更新在线用户
export const updateOnlineUser = async () => {
  const selfUserId = await getId();

  const cacheCardsDir = await get(`local/caches/cards`, { create: "dir" });

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
        data.splice(10); // 去掉10个后的，防止推送过多的用户卡片

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

        // 存放到缓存区
        cacheCardsDir
          .get(client.userId, {
            create: "file",
          })
          .then((handle) => {
            return handle.write(JSON.stringify(userData));
          })
          .then(() => {
            console.log(`写入${client.userId}卡片完成`);
          });

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

/**
 * 根据参数，获取用户卡片信息
 * @param {Object} param0 获取用户的参数
 */
export const getUser = async ({ userId }) => {
  const cards = await get("local/caches/cards", { create: "dir" });

  const users = [];

  for await (let item of cards.values()) {
    let data = await item.text();
    data = JSON.parse(data);

    const result = await verify(data);

    if (!result) {
      // TODO: 错误用户卡片报错处理
      continue;
    }

    if (userId) {
      const userData = new Map(data.data);

      if (userId && userData.get("userID") !== userId) {
        continue;
      }
    }

    users.push(data);
  }

  return users;
};
