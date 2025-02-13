// 初始化证书相关逻辑
import { on, userMiddleware, emit } from "../main.js";
import { get } from "/packages/fs/handle/index.js";
import { verify } from "../base/verify.js";
import { getHash } from "../util.js";
import { getAllCerts } from "./main.js";

{
  // 用户连接成功时，发送一次证书信息
  on("user-connected", async ({ data: { target } }) => {
    // 已经存在的证书获取一遍

    // 发送一次获取证书的请求
    target.send({
      type: "get-certs",
      exists: [],
      search: null,
    });
  });
}

// 接收到获取证书的请求
userMiddleware.set("get-certs", async (midData, client) => {
  const {
    exists, // 对面用户已存在的证书
    search, // 对面查找的证书
  } = midData;

  const relateCerts = await getAllCerts({ userId: client.userId });

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

  if (!certs || !certs.length) {
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

    const hash = await getHash({
      data: cert.data,
      sign: cert.sign,
    });

    // 写入文件
    const fileHandle = await certsCacheDir.get(hash, {
      create: "file",
    });

    await fileHandle.write(JSON.stringify(cert));
  });

  emit("change-certs", {
    certs,
  });
});
