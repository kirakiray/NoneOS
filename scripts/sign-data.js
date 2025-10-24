import { createSigner } from "../packages/crypto/crypto-ecdsa.js";

export const signDataByPair = async (originData, pair) => {
  let data = {
    ...originData,
    signTime: Date.now(),
    publicKey: pair.publicKey,
  };

  // 生成签名器
  const sign = await createSigner(pair.privateKey);

  // 签名并转换为 base64
  const signature = await sign(JSON.stringify(data));

  return {
    data,
    // 将 ArrayBuffer 转换为 base64 字符串
    signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
  };
};
