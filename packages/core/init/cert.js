// 初始化证书相关逻辑
import { on, userMiddleware } from "../main.js";
import { get } from "/packages/fs/handle/index.js";
import { verify } from "../base/verify.js";
import { getHash } from "/packages/user/util.js";

{
  // 用户连接成功时，发送一次证书信息
  on("user-connected", async ({ data: { target } }) => {
    // 发送一次获取证书的请求
    target.send({
      type: "get-certs",
      exists: [],
      search: null,
    });
  });
}

// 从目录中获取证书
const getCerts = async (certsDir, client) => {
  if (!certsDir) {
    return [];
  }

  const relateCerts = [];

  // 将和对方有关的证书
  for await (let handle of certsDir.values()) {
    let data = await handle.text();
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
      info.get("authTo") === client.userId ||
      info.get("issuer") === client.userId
    ) {
      // 和当前用户实例有关
      relateCerts.push(data);
    }
  }

  return relateCerts;
};

// 接收到获取证书的请求
userMiddleware.set("get-certs", async (midData, client) => {
  const {
    exists, // 对面用户已存在的证书
    search, // 对面查找的证书
  } = midData;

  // 获取所有证书
  const certsDir = await get("local/system/user/certs");
  const cacheCertsDir = await get("local/caches/certs");

  const relateCerts = [
    ...(await getCerts(certsDir, client)),
    ...(await getCerts(cacheCertsDir, client)),
  ];

  // TODO: 根据条件进行过滤
  if (relateCerts.length) {
    // 去除重复的证书
    const mdata = new Map();
    relateCerts.forEach((e) => mdata.set(e.sign, e));
    const certs = Array.from(mdata.values());

    client.send({
      type: "obtain-certs",
      certs,
    });
  }
});

// 得到获取证书的
userMiddleware.set("obtain-certs", async (midData, client) => {
  const { certs } = midData;

  if (!certs.length) {
    return;
  }

  // 写入到缓存证书区域
  const certsCacheDir = await get("local/caches/certs", {
    create: "dir",
  });

  certs.forEach(async (cert) => {
    // 验证证书是否正确
    const result = await verify(cert);

    if (!result) {
      // TODO: 验证不通过，进行报警
      return;
    }

    const hash = await getHash(cert);

    // 写入文件
    const fileHandle = await certsCacheDir.get(hash, {
      create: "file",
    });

    await fileHandle.write(JSON.stringify(cert));
  });
});
