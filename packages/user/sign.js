import { init } from "/packages/fs/main.js";
import { createSigner } from "./util.js";
import { getUserStore } from "./user-store.js";

// 用自身账户生成带签名的数据
export const signData = async (originData, userDirName) => {
  // 需要系统目录
  await init("system");

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
