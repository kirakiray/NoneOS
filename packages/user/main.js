import { get, init } from "/packages/fs/main.js";
import { createData } from "/packages/hybird-data/main.js";
import { generateKeyPair } from "./util.js";
import { getHash } from "/packages/fs/util.js";
import { verifyData } from "./verify.js";
import { signData } from "./sign.js";

export { verifyData, signData };

// 需要系统目录
await init("system");

// 自身用户对象
const selfUsers = {};

// 确保已经初始化了用户
export const getUserStore = async (userDirName) => {
  userDirName = userDirName || "main";
  if (selfUsers[userDirName]) {
    return selfUsers[userDirName];
  }

  return (selfUsers[userDirName] = (async () => {
    const userHandle = await get(`system/users/${userDirName}`, {
      create: "dir",
    });

    // 生成主体对象
    const userStore = await createData(userHandle);

    await userStore.ready();

    let userid;

    // 没有对钥，代表还未初始化
    if (!userStore.pair) {
      const pair = await generateKeyPair();
      userStore.pair = pair;

      await userStore.pair.ready();

      // 计算用户id
      userid = await getHash(pair.publicKey);

      // 根据id生成初始用户名
      userStore.userName = `user-${userid.slice(
        userid.length / 2,
        userid.length / 2 + 4
      )}`;

      // 初始的握手服务器地址
      userStore.servers = [];
      if (location.host.includes("localhost")) {
        userStore.servers.push({
          url: "ws://localhost:5579/",
        });
      }
    }

    if (!userid) {
      await userStore.pair.ready();
      userid = await getHash(userStore.pair.publicKey);
    }

    // 添加 tabSessionID
    const tabSessionid = Math.random().toString(36).slice(2);

    // 添加一些基础信息
    Object.defineProperties(userStore, {
      _userid: {
        get() {
          return userid;
        },
      },
      // 根当前标签页绑定的 tabSessionID
      _tabSessionid: {
        get() {
          return tabSessionid;
        },
      },
    });

    // 初始化服务器

    return userStore;
  })());
};
