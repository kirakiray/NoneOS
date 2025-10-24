import { createVerifier } from "../../crypto/crypto-ecdsa.js";

export const verify = async (signedData) => {
  const { signature, ...data } = signedData;
  const msg = JSON.stringify(data);

  const { publicKey } = data;

  // 生成验证器
  const verify = await createVerifier(publicKey);

  try {
    // 将 base64 转换回原始格式并验证签名
    const signatureBuffer = new Uint8Array(
      [...atob(signature)].map((c) => c.charCodeAt(0))
    ).buffer;

    const result = await verify(msg, signatureBuffer);

    return result;
  } catch (err) {
    // 抛出错误信息
    console.error(err);
    return false;
  }
};
