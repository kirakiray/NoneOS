import get from "/packages/fs/get.js";
import { getHash, verifyObject } from "./util.js";

// 目标目录
const getCertsDir = () => {
  return get(`local/system/user/certs`, {
    create: "dir",
  });
};

// 保存证书
export const saveCert = async (certData) => {
  const certsDir = await getCertsDir();

  // 根据哈希保存文件
  const fileHash = await getHash(certData);

  const fileHandle = await certsDir.get(fileHash, {
    create: "file",
  });
  await fileHandle.write(JSON.stringify(certData));

  return true;
};

// 获取本地证书
export const getCerts = async () => {
  const certsDir = await getCertsDir();

  const certs = [];

  for await (let item of certsDir.values()) {
    try {
      const content = await item.text();
      const data = JSON.parse(content);

      const result = await verifyObject(data);

      if (result) {
        const obj = {
          _origin: data,
        };
        const mapobj = new Map(data.data);

        // 验证签名id
        const signUserId = await getHash(mapobj.get("signPublic"));

        if (signUserId !== mapobj.get("issuer")) {
          throw new Error(`The signer's id is inconsistent`);
        }

        data.data.forEach(([k, v]) => {
          obj[k] = v;
        });
        certs.push(obj);
      }
    } catch (err) {
      debugger;
    }
  }

  return certs;
};
