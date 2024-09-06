import { get } from "/packages/fs/handle/index.js";
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
export const getCerts = async (certsData) => {
  const certsDir = await getCertsDir();

  const certs = [];

  for await (let item of certsData || certsDir.values()) {
    try {
      let data;
      if (item.text) {
        const content = await item.text();
        data = JSON.parse(content);
      } else {
        data = item;
      }

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
        obj.id = item.name || (await getHash(data));
        certs.push(obj);
      }
    } catch (err) {
      debugger;
    }
  }

  certs.sort((a, b) => {
    return b.creation - a.creation;
  });

  return certs;
};

// 删除指定id的证书
export const deleteCerts = async (ids) => {
  const certsDir = await getCertsDir();

  await Promise.all(
    ids.map(async (id) => {
      const file = await certsDir.get(id);

      if (file) {
        await file.remove();
      }
    })
  );
};
