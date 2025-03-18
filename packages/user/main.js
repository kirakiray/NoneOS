import { get } from "/packages/fs/main.js";
import { createData } from "/packages/hybird-data/main.js";
import { generateKeyPair } from "./util.js";
import { getHash } from "/packages/fs/util.js";

// 自身用户对象
const selfUsers = {};

// 确保已经初始化了用户
export const getUserStore = async (userDirName = "self") => {
  if (selfUsers[userDirName]) {
    return selfUsers[userDirName];
  }

  return (selfUsers[userDirName] = (async () => {
    const userHandle = await get(`system/${userDirName}`, {
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
    }

    if (!userid) {
      await userStore.pair.ready();
      userid = await getHash(userStore.pair.publicKey);
    }

    userStore._userid = userid;

    return userStore;
  })());
};
