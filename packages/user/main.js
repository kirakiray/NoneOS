import { get, init } from "/packages/fs/main.js";
import { createData } from "/packages/hybird-data/main.js";
import { generateKeyPair } from "./util.js";
import { getHash } from "/packages/fs/util.js";
import { createSigner } from "./util.js";
import { verifyData } from "./verify.js";

export { verifyData };

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
    }

    if (!userid) {
      await userStore.pair.ready();
      userid = await getHash(userStore.pair.publicKey);
    }

    userStore._userid = userid;

    return userStore;
  })());
};

// 用自身账户生成带签名的数据
export const signData = async (originData, userDirName) => {
  let userStore;
  if (!userDirName || typeof userDirName === "string") {
    // 获取私钥准备签名
    userStore = await getUserStore(userDirName);
  } else if (typeof userDirName === "object" && userDirName.pair) {
    userStore = userDirName;
  }

  await userStore.pair.ready();

  let data = {
    time: Date.now(),
    origin: originData,
    publicKey: userStore.pair.publicKey,
  };

  // 生成签名器
  const sign = await createSigner(userStore.pair.privateKey);

  // 签名并转换为 base64
  const signature = await sign(JSON.stringify(data));

  return {
    data,
    // 将 ArrayBuffer 转换为 base64 字符串
    signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
  };
};
