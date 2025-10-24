/**
 * 数据验证相关工具函数
 */

import { createVerifier } from "./crypto-ecdsa.js";

/**
 * 验证数据签名
 * @param {Object} params - 验证参数
 * @param {Object} params.data - 包含公钥和数据的对象
 * @param {string} params.signature - base64 编码的签名
 * @returns {Promise<boolean>} 验证结果
 */
export const verifyData = async ({ data, signature }) => {
  const { publicKey } = data;

  // 生成验证器
  const verify = await createVerifier(publicKey);

  try {
    // 将 base64 转换回原始格式并验证签名
    const signatureBuffer = new Uint8Array(
      [...atob(signature)].map((c) => c.charCodeAt(0))
    ).buffer;

    const result = await verify(JSON.stringify(data), signatureBuffer);

    return result;
  } catch (err) {
    // 抛出错误信息
    console.error(err);
    return false;
  }
};
