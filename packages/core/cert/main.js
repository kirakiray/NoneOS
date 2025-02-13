// 和证书相关的方法
import { get } from "/packages/fs/handle/index.js";
import { verify } from "../base/verify.js";
import { getHash } from "../util.js";
import { signData } from "../base/sign.js";
import { emit } from "../main.js";
import { getId } from "../base/pair.js";

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
 * 获取所有证书
 * @param {string} userId 只获取目标用户id的证书
 */
export const getAllCerts = async ({ userId, filterExpired = 1 } = {}) => {
  // 获取所有证书
  const certsDir = await get("local/system/user/certs");
  const cacheCertsDir = await get("local/caches/certs");

  const relateCerts = await getCerts(certsDir, userId, filterExpired);
  const cacheCerts = await getCerts(cacheCertsDir, userId, filterExpired);

  await Promise.all(
    cacheCerts.map(async (e) => {
      // 去重复
      if (!relateCerts.some((item) => item.sign === e.sign)) {
        // 验证通过的
        const result = await verify(e);

        if (result) {
          relateCerts.push(e);
        }
      }
    })
  );

  return relateCerts;
};

/**
 * 将证书导入到本地
 * @param {Object} certItem 证书对象
 */
export const importCert = async (certItem) => {
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

  emit("change-certs", {
    type: "add-cert",
    certs: [reItem],
  });

  return {
    code: "ok",
  };
};

// 根证书公钥
export const rootPublic = `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEwqKk1tx1Pr7XcTCSnCaLOtbSnAPgO6LYLlK2Z1gOPAUCs+e6kzXDtScowZhso0yEp+J/Z5X6saYx8iveBvxKjg==`;

// 创建证书
export const createCert = async ({ ...data }) => {
  if (data.expire) {
    if (data.expire !== "never" && /\D/.test(data.expire)) {
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

  emit("change-certs", {
    type: "add-cert",
    certs: [afterData],
  });

  return afterData;
};

// 获取我的设备的所有证书
export const getMyDeviceCerts = async () => {
  const certs = await getAllCerts();

  // 我颁发fully证书给的用户，并且对方也给我了fully证书，就是我的设备
  const myDevices = [];

  // 我颁发的证书
  const issuseds = [];
  // 颁发给我的证书
  const receiveds = [];

  const myId = await getId();

  certs.forEach((cert) => {
    const data = new Map(cert.data);

    cert._data = data;

    const authTo = data.get("authTo");
    const issuer = data.get("issuer");

    if (authTo === myId) {
      receiveds.push(cert);
    } else if (issuer === myId) {
      issuseds.push(cert);
    }
  });

  if (issuseds.length) {
    // 查看是否也有收到证书
    await Promise.all(
      issuseds.map(async (cert) => {
        const authTo = cert._data.get("authTo");

        if (!authTo) {
          return;
        }

        const receivedCert = receiveds.find(
          (cert) => cert._data.get("issuer") === authTo
        );

        if (receivedCert) {
          const received = {
            data: receivedCert.data,
            sign: receivedCert.sign,
          };

          const issused = {
            data: cert.data,
            sign: cert.sign,
          };

          myDevices.push({
            userId: authTo,
            received,
            issused,
            receivedCertData: Object.fromEntries(receivedCert._data),
            issusedCertData: Object.fromEntries(cert._data),
          });

          // 将临时证书放到用户私人文件夹
          const collectCert = async (cert) => {
            const certHash = await getHash(cert);

            const userCertsDir = await get("local/system/user/certs", {
              create: "dir",
            });

            const cachedCertHandle = await get(
              `local/caches/certs/${certHash}`
            );

            // 确认是设备联合证书，对证书进行收藏
            const certHandle = await userCertsDir.get(certHash);

            if (!certHandle && cachedCertHandle) {
              await cachedCertHandle.moveTo(userCertsDir);

              console.log("cert: ", cert);
            }
          };

          await collectCert(received);
          await collectCert(issused);
        }
      })
    );
  }

  return myDevices;
};

// 删除证书
export const removeCert = async (certData) => {
  const hash = await getHash(certData);

  console.log("hash: ", hash);

  const certHandle = await get(`local/system/user/certs/${hash}`).catch(
    () => null
  );

  if (certHandle) {
    await certHandle.remove();
  }

  const cacheCertHandle = await get(`local/caches/certs/${hash}`).catch(
    () => null
  );

  if (cacheCertHandle) {
    await cacheCertHandle.remove();
  }

  emit("change-certs", {
    type: "remove-cert",
    certs: [],
  });
};
