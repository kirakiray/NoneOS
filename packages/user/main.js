import { get } from "/packages/fs/main.js";
import { createData } from "/packages/hybird-data/main.js";
import { generateKeyPair } from "./util.js";
import { getHash } from "/packages/fs/util.js";
import { createSigner, createVerifier } from "./util.js";

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
  // 获取私钥准备签名
  const userStore = await getUserStore(userDirName);
  await userStore.pair.ready();

  let data = {
    createTime: Date.now(),
    origin: originData,
    publicKey: userStore.pair.publicKey,
  };

  // 生成签名器
  const sign = await createSigner(userStore.pair.privateKey);

  // 签名
  const signature = await sign(JSON.stringify(data));

  return {
    data,
    signature,
  };
};

// 验证数据
export const verfyData = async ({ data, signature }) => {
  const { publicKey } = data;

  // 生成验证器
  const verify = await createVerifier(publicKey);

  // 验证签名
  const result = await verify(JSON.stringify(data), signature);

  return {
    result,
    data: data.originData,
  };
};
