import { init } from "/packages/fs/main.js";
import { createSigner } from "./util.js";
import { getUserStore } from "./user-store.js";

// 用自身账户生成带签名的数据
export const signData = async (originData, useLocalUserDirName) => {
  // 需要系统目录
  await init("system");

  let userStore;
  if (!useLocalUserDirName || typeof useLocalUserDirName === "string") {
    // 获取私钥准备签名
    userStore = await getUserStore(useLocalUserDirName);
  } else if (
    typeof useLocalUserDirName === "object" &&
    useLocalUserDirName.pair
  ) {
    userStore = useLocalUserDirName;
  }

  if (userStore.pair.ready) {
    await userStore.pair.ready();
  }

  let data = {
    ...originData,
    signTime: Date.now(),
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
