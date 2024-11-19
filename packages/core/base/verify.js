import { dataToArrayBuffer, base64ToArrayBuffer } from "/packages/user/util.js";

/**
 * 验证数据是否正确
 * @param {Object} opts 需要验证的数据
 */
export const verify = async (opts) => {
  const { data, sign } = opts;

  const target = data.find((e) => e[0] === "signPublic");

  if (!target) {
    console.log(`Missing signPublic`);
    return false;
  }

  return await verifyMessage(data, sign, target[1]);
};

// 验证信息
export async function verifyMessage(message, signature, publicKey) {
  const data = dataToArrayBuffer(message);

  const realPublicKey = await crypto.subtle.importKey(
    "spki", // 导入的密钥类型，这里是公钥
    base64ToArrayBuffer(publicKey),
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"] // 只需要验证权限
  );

  return await crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    realPublicKey,
    base64ToArrayBuffer(signature),
    data
  );
}
