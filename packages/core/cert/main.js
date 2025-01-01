// 和证书相关的方法
import { get } from "/packages/fs/handle/index.js";
import { verify } from "../base/verify.js";
import { getHash } from "../util.js";
import { signData } from "../base/sign.js";

/**
 * 获取所有证书
 * @param {string} userId 只获取目标用户id的证书
 */
export const getAllCerts = async ({ userId, filterExpired = 1 } = {}) => {
  // 获取所有证书
  const certsDir = await get("local/system/user/certs");
  const cacheCertsDir = await get("local/caches/certs");

  const relateCerts = await getCerts(certsDir, userId, filterExpired);
  const cacheCerts = await getCerts(cacheCertsDir, userId, filterExpired);

  // 去重复
  cacheCerts.forEach((e) => {
    if (!relateCerts.some((item) => item.sign === e.sign)) {
      relateCerts.push(e);
    }
  });

  return relateCerts;
};

// 从目录中获取证书
const getCerts = async (certsDir, userId, filterExpired) => {
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
      filterExpired &&
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

/**
 * 将证书导入到本地
 * @param {Object} certItem 证书对象
 * @param {boolean} toCache 是否放到缓存
 */
export const importCert = async (certItem, toCache = false) => {
  const reItem = {
    data: certItem.data,
    sign: certItem.sign,
  };

  // 验证证书正确性
  const result = await verify(reItem).catch(() => false);
  if (!result) {
    const err = new Error(`Certificate verification failed`);
    err.code = "cert-failed";
    return err;
  }

  const itemStr = JSON.stringify(reItem);

  // 获取指纹
  const hash = await getHash(itemStr);

  const exitedHandle = await get(`local/system/user/certs/${hash}`, {
    create: "file",
  });

  const oldText = await exitedHandle.text();

  if (oldText === itemStr) {
    return {
      code: "already",
    };
  }

  // 写入内容
  await exitedHandle.write(itemStr);

  return {
    code: "ok",
  };
};

// 根证书公钥
export const rootPublic = `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEwqKk1tx1Pr7XcTCSnCaLOtbSnAPgO6LYLlK2Z1gOPAUCs+e6kzXDtScowZhso0yEp+J/Z5X6saYx8iveBvxKjg==`;

// 创建证书
export const createCert = async ({ ...data }) => {
  if (data.expire) {
    if (data.expire !== "never") {
      let expire = Date.now();

      switch (data.expire) {
        case "1second":
          expire += 1000;
          break;
        case "1hour":
          expire += 60 * 60 * 1000;
          break;
        case "1day":
          expire += 60 * 60 * 1000 * 24;
          break;
        case "1week":
          expire += 60 * 60 * 1000 * 24 * 7;
          break;
      }

      data.expire = expire;
    }
  }

  const afterData = await signData(Object.entries(data));

  const certsHandle = await get("local/system/user/certs", {
    create: "dir",
  });

  const fileHash = await getHash(afterData);

  // 写入并保存文件哈希
  const fileHandle = await certsHandle.get(fileHash, {
    create: "file",
  });

  await fileHandle.write(JSON.stringify(afterData));

  return afterData;
};
