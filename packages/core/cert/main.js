// 和证书相关的方法
import { get } from "/packages/fs/handle/index.js";
import { verify } from "../base/verify.js";

/**
 * 获取所有证书
 * @param {string} userId 只获取目标用户id的证书
 */
export const getAllCerts = async ({ userId } = {}) => {
  // 获取所有证书
  const certsDir = await get("local/system/user/certs");
  const cacheCertsDir = await get("local/caches/certs");

  const relateCerts = [
    ...(await getCerts(certsDir, userId)),
    ...(await getCerts(cacheCertsDir, userId)).map((e) => {
      return { ...e, iscache: 1 };
    }),
  ];

  return relateCerts;
};

// 从目录中获取证书
const getCerts = async (certsDir, userId) => {
  if (!certsDir) {
    return [];
  }

  const relateCerts = [];

  // 将和对方有关的证书
  for await (let handle of certsDir.values()) {
    let data = await handle.text();

    if (!data) {
      continue;
    }

    data = JSON.parse(data);

    const result = await verify(data);

    if (!result) {
      // 不通过的不用
      continue;
    }

    const info = new Map(data.data);

    // 去除过期的
    const expire = info.get("expire");
    if (
      expire !== "never" &&
      typeof expire === "number" &&
      Date.now() > expire
    ) {
      // 已经过期了
      continue;
    }

    if (
      !userId ||
      info.get("authTo") === userId ||
      info.get("issuer") === userId
    ) {
      // 和当前用户实例有关
      relateCerts.push(data);
    }
  }

  return relateCerts;
};
